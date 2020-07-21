const { isEmpty } = require('./validationFunctions');

// export the userDetails
exports.reduceUserDetails = (data) => {
    const userDetails = {};

    if (!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
    
    if (!isEmpty(data.website.trim())) {
        // https://website.com
        if (data.website.trim().substring(0, 4) !== 'http'){
            userDetails.website = `http://${data.website.trim()}`;
        } else {
            userDetails.website = data.website;
        }
    }
    
    if (!isEmpty(data.location.trim())) userDetails.location = data.location;

    return userDetails;
}