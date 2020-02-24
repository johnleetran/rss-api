let AWS = require('aws-sdk');
let fs = require('fs');
let fetch = require('node-fetch');
let response;
let region = process.env.region || 'us-west-1';
let s3 = new AWS.S3({ region: region });
let bucket = process.env.bucket || 'jotran-rss-feed-dev';
let feedObjectKey = 'feeds.json';
let XML = require('xml2js')

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

async function getRSSFeedData(urls){
    let data = []
    for(let url of urls.urls){
        let rssFetch = await fetch(url.trim());
        let rssXml = await rssFetch.text();
        let xml = await XML.parseStringPromise(rssXml)
        console.log("fdsfsfsdfasfdfs>>>>>>>>>", xml['rss']['channel'][0])
        let title = xml['rss']['channel'][0]['title'].pop()
        let item = xml['rss']['channel'][0]['item']
        hostData = {
            title: title,
            feeds: []
        }
        for(let i of item){

            let item_title = i.title.pop()
            let link = i.link.pop();
            let description = i.description.pop()
            hostData.feeds.push({ 
                //title: title, 
                item : { 
                    title: item_title, 
                    link: link, 
                    description: description 
                } 
            })           
        }
        data.push(hostData)

    }
    return data;
}

exports.lambdaHandler = async (event, context) => {
    try {
        console.log("getSavedFeeds")
        let s3Data = await getSavedFeeds();

        console.log("getRSSFeedData")
        let rssFeedData = await getRSSFeedData(s3Data);
        response = {
            'statusCode': 200,
            headers: {
              'Access-Control-Allow-Origin': '*'
            },
            'body': JSON.stringify({"urls": rssFeedData})
        }
    } catch (err) {
        console.log(err);
        return err;
    }

    return response
};
