## <small>Free Code Camp API project</small>
# URL Shortener Microservice

Made according to the instructions here:  
http://www.freecodecamp.com/challenges/url-shortener-microservice

### Client usage

Visit or issue a GET request to `/new/url` where `url` is the URL you want shortened. If the provided URL is valid, a "shortened" URL will be provided under the `short_url` key of the JSON response which can be visited to redirect you to the original url.

#### Response format

Valid URL:

```
{
  "original_url": "...",
  "short_url": "..."
}
```

Invalid URL:

```
{
  "error": "Format of provided URL is invalid. Remember to use an http:// or https:// prefix.",
  "provided_url": "..."
}
```