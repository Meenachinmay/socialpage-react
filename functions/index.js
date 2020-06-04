const functions = require('firebase-functions');

const admin = require('firebase-admin');

const app = require('express')();
admin.initializeApp(functions.config().firebase);

const config = {
    apiKey: "AIzaSyCGntR4Sm4y960n46VUygtJwONMMVXAiWo",
    authDomain: "socialpage-react.firebaseapp.com",
    databaseURL: "https://socialpage-react.firebaseio.com",
    projectId: "socialpage-react",
    storageBucket: "socialpage-react.appspot.com",
    messagingSenderId: "733309548610",
    appId: "1:733309548610:web:c0d9d9b2a6996874bed5db",
    measurementId: "G-CR05RZ2RZP"
  };

const firebase = require('firebase');
firebase.initializeApp(config)

const db = admin.firestore();

//　もう作ったスーキルムを探して、もらうべく
app.get('/screams', (req, res) => {
    db
    .collection('screams')
    .orderBy('createdAt','desc')
    .get()
    .then(data => {
        let screams = [];
        data.forEach(doc => {
            screams.push({
                screamId: doc.id,
                body: doc.data().body,
                userHandle: doc.data().userHandle,
                createdAt: doc.data().createdAt,
                commentCount: doc.data().commentCount,
                likeCount: doc.data().likeCount,
            });
        });
        return res.json(screams);
    })    
    .catch(err => console.log(err));
});

//  新しいスーキルムを作るべく
app.post('/new-scream',(req, res) => {
    const newScream = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString()
    }

    db
        .collection('screams')
        .add(newScream)
        .then(doc => {
            res.json({ message: `ドキュメント ${doc.id} を作成させていただきました。`});
        })
        .catch(err => {
            res.status(500).json({ error: `何かがうまくいきませんでした。`});
            console.error(err);
        }); 
});

//
app.post('/signup', (req,res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    };
    
    // TODO validate data
    let token, userId;
    db.doc(`/users/${newUser.handle}`).get()
        .then(doc => {
            if (doc.exists){
                return res.json(400).json({handle: 'this handle is already taken by other user'});
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
                userId
            };
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() => {
            return res.status(201).json({token});
        })
        .catch(error => {
            console.error(error);
            return res.status(500).json({error: err.code});
        });
});

exports.api = functions.region('us-central1').https.onRequest(app);