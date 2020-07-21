const { admin, firebase } = require('../utils/admin');
const db = admin.firestore();
const { reduceUserDetails } = require('../utils/validators');
const { isEmpty, isEmail } = require('../utils/validationFunctions');
const { config } = require('../utils/config');

// Register new user
exports.registerUser = (req, res) => {
  const newUser = {
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
      handle: req.body.handle,
  };

  let errors = {};

  if (isEmpty(newUser.email)){
      errors.email = 'Must not be empty'
  }else if (!isEmail(newUser.email)){
      errors.email = 'Must be a valid email address'
  }

  if (isEmpty(newUser.password)) errors.password = 'Must not be empty';
  if (newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'Passwords must match';
  if (isEmpty(newUser.handle)) errors.handle = 'Must not be empty';

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

  const noImg = 'no-img.png';

  // TODO validate data
  let token, userId;
  db.doc(`/users/${newUser.handle}`).get()
      .then(doc => {
          if (doc.exists){
              return res.status(400).json({ handle: 'this handle is already taken by other user' });
          }else {
              return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
          }
      })
      .then(data => {
          userId = data.user.uid;
          return data.user.getIdToken();
      })
      .then(idToken => {
          token = idToken;
          const userCredentials = {
              handle: newUser.handle,
              email: newUser.email,
              createdAt: new Date().toISOString(),
              imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
              userId
          };
          return db.doc(`/users/${newUser.handle}`).set(userCredentials);
      })
      .then(() => {
          return res.status(201).json({token});
      })
      .catch(error => {
          console.error(error);
          return res.status(500).json({error: error.code});
      });
}

// Login user handler
exports.loginUser = (req, res) => {
  const user = {
      email: req.body.email,
      password: req.body.password
  };

  let errors = {};

  if (isEmpty(user.email)) errors.email = 'Must not empty';
  if (isEmpty(user.password)) errors.password = 'Must not empty';

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

  firebase.auth().signInWithEmailAndPassword(user.email, user.password)
      .then(data => {
          return data.user.getIdToken();
      })
      .then(token => {
          return res.json({token});
      })
      .catch(err => {
          console.error(err);
          if (err.code === 'auth/wrong-password'){
              return res.status(403).json({general: 'Wrong credentials, please try again with correct email and password'});
          }else return res.status(500).json({ error: err.code });
      })
}

// Add user details
exports.addUserDetails = (req, res) => {
    const userDetails = reduceUserDetails(req.body);

    db.doc(`/users/${req.user.handle}`).update(userDetails)
        .then(() => {
            return res.json({ message: 'Details added successfully'});
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({error: err.code});
        });
};

// get authenticatd user details
exports.getAuthenticatedUser = (req, res) => {
    const userData = {};
    db.doc(`/users/${req.user.handle}`).get()
        .then(doc => {
            if (doc.exists){
                userData.credentials = doc.data();
                return db.collection('likes').where('userHandle', '==', req.user.handle).get()
            }
        })
        .then(data => {
            userData.likes = [];
            data.forEach(doc => {
                userData.likes.push(doc.data());
            });
            return res.json(userData);
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code });
        });
}
