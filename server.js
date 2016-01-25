'use strict';
const express = require("express");
const mongo = require("mongodb").MongoClient;
const isValidURL = require("valid-url").isWebUri;

const app = express();
const mongoURL = process.env.MONGOLAB_URI || `mongodb://${process.env.IP}:27017/url-shortener`;

app.set('views', __dirname);
app.set('view engine', 'jade');

mongo.connect(mongoURL, (err, db) => {
  if (err) throw err;
  console.log("Successfully connected to MongoDB.");
  
  const urls = db.collection("urls");
  
  urls.createIndexes(
    [
      {key: {original_url: 1}, unique: true},
      {key: {sequence_id: -1}, unique: true}
    ],
    (err, result) => {
      if (err) throw err;
      console.log("Indexes created/verified.");
      
      // Initialize sequence in case no documents exist yet
      let sequenceID = 0;
  
  
      // Create a new shortened URL
      app.get("/new/:url(*)", validateURL, alreadyExists, (req, res) => {
        
        const originalURL = req.params.url;
        
        // Look for the document with the highest sequence_id
        urls.find().sort({sequence_id: -1}).limit(1).next((err, doc) => {
          if (err) throw err;
          
          // Add 1 for the new document
          if (doc && doc.sequence_id >= 0)
            sequenceID = doc.sequence_id + 1;
          
          // Insert the new document
          urls.insertOne({
            original_url: originalURL,
            sequence_id: sequenceID
          }, (err, result) => {
            if (err) throw err;
            
            const shortURL = idToUrl(sequenceID, req);
            const jsonResponse = urlJSON(originalURL, shortURL);
            
            res.json(jsonResponse);
          });
          
        });
      }); //end app.get(...)
      
      
      // Use shortened URL to redirect to original
      app.get("/:urlKey", (req, res) => {
        const urlKey = req.params.urlKey;
        
        const cursor = urls.find({sequence_id: parseInt(urlKey, 36)}).limit(1);
        
        cursor.hasNext((err, exists) => {
          if (err) throw err;
          
          if (exists) {
            cursor.next((err, doc) => {
              if (err) throw err;
              
              res.redirect(doc.original_url);
            });
          } else {
            res.status(404).json({
              error: "No URL associated with this key."
            });
          }
        });
      });
      
      
      // Fallthrough: serve instructions
      app.get("*", (req, res) => {
        res.render("index");
      });
      
      
      // Start the server
      const server = app.listen(process.env.PORT || 8080, () => {
        console.log(`Server listening on port ${server.address().port}`);
      });
    }
  ); //end urls.createIndexes
  
  
  // Middleware to check that the URL is valid
  function validateURL(req, res, next) {
    const url = req.params.url;
    
    if (!isValidURL(url))
      return res.status(422).json({
        error: "Format of provided URL is invalid. Remember to use an http:// or https:// prefix.",
        provided_url: url
      });
    
    next();
  }
  
  // Middleware to check if the requested URL has been shortened previously
  function alreadyExists(req, res, next) {

    const cursor = urls.find({original_url: req.params.url}).limit(1);

    cursor.hasNext((err, exists) => {
      if (err) throw err;

      if (exists) {
        // Return pre-existing document
        cursor.next((err, doc) => {
          if (err) throw err;
          
          const shortURL = idToUrl(doc.sequence_id, req);
          const jsonResponse = urlJSON(doc.original_url, shortURL);
          
          res.json(jsonResponse);
        });
        
      } else {
        // Move on to creating a new document
        next();
      }
    });
  }
  
  // JSON response format (success)
  function urlJSON(originalURL, shortURL) {
    return {
      original_url: originalURL,
      short_url: shortURL
    };
  }
  
  // Convert sequence ID to URL
  function idToUrl(id, req) {
    return `${req.protocol}://${req.hostname}/${id.toString(36)}`;
  }
  
  // Convert shortened URL "key" to sequence ID
  function keyToId(key) { return parseInt(key, 36); }

}); //end mongo.connect