// Change this to your repository name
var GHPATH = '/mbta-app';
 
// Choose a different app prefix name
var APP_PREFIX = 'mbtaapp_';
 
// The version of the cache. Every time you change any of the files
// you need to change this version (version_01, version_02…). 
// If you don't change the version, the service worker will give your
// users the old files!
var VERSION = 'version_00';
 
// The files to make available for offline use. make sure to add 
// others to this list
var URLS = [    
	`${GHPATH}/`,
	`${GHPATH}/index.htm`,
	`${GHPATH}/style/styles.css`,
	`${GHPATH}/mbta-app.png`,
	`${GHPATH}/script/lib/jquery-3.6.4.min.js`,
	`${GHPATH}/script/lib/lodash.min.js`,
	`${GHPATH}/script/api.js`,
	`${GHPATH}/script/script.js`,
	`${GHPATH}/script/schedule.js`,
	`${GHPATH}/script/lib/moment.min.js`,
	`${GHPATH}/script/lib/moment-duration-format.js`
]