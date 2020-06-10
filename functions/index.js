const functions = require('firebase-functions');

const app = require('express')();

const { getAllScreams, createNewScream } = require('./handlers/screams');
const { signup, login} = require('./handlers/users');
const { admin } = require('./utils/admin');

//　もう作ったスーキルムを探して、もらうべく
app.get('/screams', getAllScreams);

const FBAuth = (req, res, next) => {
    let idToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
        idToken = req.headers.authorization.split('Bearer ')[1];
    }else {
        console.error('No token found');
        return res.status(403).json({error: 'Unauthorized'});
    }

    admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
            req.user = decodedToken;
            console.log(decodedToken);
            return db.collection('users')
                .where('userId', '==', req.user.uid)
                .limit(1)
                .get();
        })
        .then(data => {
            req.user.handle = data.docs[0].data().handle;
            return next();
        })
        .catch(error => {
            console.log('Error while verifying token ',error);
            return res.status(403).json({ error, message: "hello world" });
        });
};

//  新しいスーキルムを作るべく
app.post('/new-scream',FBAuth, (req, res) => {
    const newScream = {
        body: req.body.body,
        userHandle: req.user.handle,
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

// Signup Route
app.post('/signup', signup);
// Login route
app.post('/login', login);

exports.api = functions.region('us-central1').https.onRequest(app);