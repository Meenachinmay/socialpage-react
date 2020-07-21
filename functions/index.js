const { functions, admin, firebase } = require('./utils/admin');

const { config } = require('./utils/config');

const app = require('express')();

admin.initializeApp(functions.config().firebase);
firebase.initializeApp(config)

const db = admin.firestore();

const { addUserDetails, getAuthenticatedUser, loginUser, registerUser } = require('./handlers/users');
const { FBauth } = require('./utils/fbAuth');

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
app.post('/new-scream',FBauth, (req, res) => {
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

// Register the new user
app.post('/register', registerUser);

// Login the user
app.post('/login',loginUser);

// Upload the image
app.post('/user/image', FBauth,(req, res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new BusBoy({ headers: req.headers });

    let imageFilename;
    let imageToBeUploaded = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {

        if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
            return res.status(400).json({error: 'Wrong file type posted'});
        }

        const imageExtension = filename.split('.')[filename.split('.').length - 1];

        imageFilename = `${Math.round(Math.random() * 100000000000)}.${imageExtension}`;
        const filePath = path.join(os.tmpdir(), imageFilename);
        imageToBeUploaded = { filePath, mimetype };
        file.pipe(fs.createWriteStream(filepath));
    });

    busboy.on('finish', () => {
        admin.storage().bucket(config.storageBucket).upload(imageToBeUploaded.filePath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToBeUploaded.mimetype
                }
            }
        })
        .then(() => {
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFilename}?alt=media`;
            return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
        })
        .then(() => {
            return res.json({ message: 'Image uploaded successfully' });
        })
        .catch(err => {
            console.error(err);
            return res.status(403).json({ error: err.code });
        });
    });
    busboy.end(req.rawBody);
});

// add user details
app.post('/user', FBauth, addUserDetails);
// get authenticated user
app.get('/user', FBauth, getAuthenticatedUser);

exports.api = functions.region('us-central1').https.onRequest(app);
