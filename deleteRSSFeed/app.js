let AWS = require('aws-sdk');
let fs = require('fs');
let response;
let region = process.env.region || 'us-west-1';
let s3 = new AWS.S3({ region: region });
let bucket = process.env.bucket || 'jotran-rss-feed-dev';
let feedObjectKey = 'feeds.json';

function saveFeed(data) {
    return new Promise((resolve, reject) => {
        let params = {
            Bucket: bucket,
            Key: feedObjectKey,
            Body: data
        }
        s3.putObject(params, (err, data) => {
            if (err) {
                reject(err)
            } else {
                resolve(data)
            }
        })
    })
}

function getSavedFeeds() {
    return new Promise((resolve, reject) => {
        let params = {
            Bucket: bucket,
            Key: feedObjectKey
        }
        s3.getObject(params, (err, data) => {
            if (err) {
                console.warn(err)
                resolve({ "urls": [] })
            } else {
                resolve(JSON.parse(data.Body.toString()));
            }
        })
    })
}

exports.lambdaHandler = async (event, context) => {
    try {
        let s3Data = await getSavedFeeds();
        let body = JSON.parse(event.body);
        let feedToAdd = body.url
        s3Data.urls = s3Data.urls.filter( (url) => {
            if (feedToAdd != url){
                return true;
            }
            return false;
        });
        await saveFeed(JSON.stringify(s3Data));

        console.log(s3Data);
        response = {
            'statusCode': 200,
            headers: {
              'Access-Control-Allow-Origin': '*'
            },
            'body': JSON.stringify(s3Data)
        }
    } catch (err) {
        console.log(err);
        return err;
    }

    return response
};
