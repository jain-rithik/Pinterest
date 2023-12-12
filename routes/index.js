var express = require('express');
var router = express.Router();
const userModel = require("./users");
const postModel = require("./posts");
const passport = require('passport');
const localStrategy = require("passport-local");
const upload = require("./multer");

passport.use(new localStrategy(userModel.authenticate()));

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { nav: false });
});

router.get('/register', function (req, res, next) {
  res.render('register', { nav: false });
});

router.get('/profile', isLoggedIn, async function (req, res, next) {
  const user =
    await userModel
      .findOne({ username: req.session.passport.user })
      .populate("posts")
  res.render('profile', { user, nav: true });
});

router.get('/show/posts', isLoggedIn, async function (req, res, next) {
  const user =
    await userModel
      .findOne({ username: req.session.passport.user })
      .populate("posts")
  res.render('show', { user, nav: true });
});

router.get('/show/posts/:postId', isLoggedIn, async function (req, res, next) {
  const postId = req.params.postId;
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });
    const post = await postModel.findById(postId).populate("user");

    if (!post) {
      return res.status(404).send("Post not found");
    }

    res.render("postDetails", { post, user, nav: true });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving post details");
  }
})

router.get('/edit/post/:postId', isLoggedIn, async function (req, res, next) {
  const postId = req.params.postId;
  try {
    const post = await postModel.findById(postId);

    if (!post) {
      return res.status(404).send("Post not found");
    }

    if (!post.user.equals(req.user._id)) {
      return res.status(403).send("Unauthorized");
    }
    res.render("editPost", { post, nav: true });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving post details");
  }
})

router.post('/update/post/:postId', isLoggedIn, upload.single("image"), async function (req, res, next) {
  const postId = req.params.postId;
    try {
        const post = await postModel.findById(postId);

        if (!post) {
            return res.status(404).send("Post not found");
        }

        if (!post.user.equals(req.user._id)) {
            return res.status(403).send("Unauthorized");
        }

        post.tittle = req.body.tittle;
        post.description = req.body.description;

        if (req.file) {
            post.image = req.file.filename; // Assuming you're storing the file name
        }

        await post.save();
        res.redirect('/feed');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating post');
    }
})

router.post('/delete/post/:postId', isLoggedIn, async function (req, res, next) {
  const postId = req.params.postId;
    try {
        const post = await postModel.findById(postId);

        if (!post) {
            return res.status(404).send("Post not found");
        }

        if (!post.user.equals(req.user._id)) {
            return res.status(403).send("Unauthorized");
        }

        await postModel.findByIdAndDelete(postId);
        res.redirect('/feed');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating post');
    }
})


router.get('/feed', isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const posts = await postModel.find().populate("user")

  res.render("feed", { user, posts, nav: true });
});

router.get('/add', isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render('add', { user, nav: true });
});

router.post('/createpost', isLoggedIn, upload.single("postimage"), async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.create({
    user: user._id,
    tittle: req.body.tittle,
    description: req.body.description,
    image: req.file.filename,
  });

  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile")
});

router.post('/fileupload', isLoggedIn, upload.single("image"), async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  user.profileImage = req.file.filename;
  await user.save();
  res.redirect("/profile");
});

router.post('/register', function (req, res, next) {
  const data = new userModel({
    name: req.body.fullname,
    username: req.body.username,
    email: req.body.email,
    contact: req.body.contact
  })

  userModel.register(data, req.body.password)
    .then(function () {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/profile");
      })
    })
});

router.post("/login", passport.authenticate("local", {
  successRedirect: "/profile",
  failureRedirect: "/",
}), function (req, res, next) {
})

router.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
})

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}

module.exports = router;
