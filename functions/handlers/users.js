const admin = require('firebase-admin');

const db = admin.firestore();
const { reduceUserDetails } = require('../utils/validators');
const { user } = require('firebase-functions/lib/providers/auth');

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