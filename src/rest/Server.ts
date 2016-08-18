/**
 * Created by rtholmes on 2016-06-19.
 */

/*
 export default class Server {
 private port:number;

 constructor(port:number) {
 console.log("Server::<init>( " + port + " )");
 this.port = port;
 this.start();
 }

 private start():void {

 }
 }
 */
/*
 /// <reference path="../../lib/corejs.d.ts" />
 */

import restify = require('restify');
import Log from "../Util";
import RouteHandler from './RouteHandler';
const path = require('path');

export default class Server {

    private port:number;
    private rest:restify.Server;

    constructor(port:number) {
        Log.info("Server::<init>( " + port + " )");
        this.port = port;
    }

    public stop():Promise<boolean> {
        Log.info('Server::close()');
        let that = this;
        return new Promise(function (fulfill, reject) {
            that.rest.close(function () {
                fulfill(true);
            })
        });
    }

    public start():Promise<boolean> {
        let that = this;

        return new Promise(function (fulfill, reject) {
            try {
                that.rest = restify.createServer({
                    name: 'classPortal'
                });
                
                /*  Bundled middleware start */

                //parses the body of the request into req.params
                that.rest.use(restify.bodyParser());
                
                that.rest.use(function(req, res, next){
                    //Set permissive CORS header - this allows this server to be used only as
                    //an API server in conjunction with something like webpack-dev-server.
                    //TODO: delete??
                    res.setHeader('Access-Control-Allow-Origin', '*');    
                    //Disable caching so we'll always get the latest data
                    res.setHeader('Cache-Control', 'no-cache');
                    console.log('\n' + req.method + ' ' + req.url);
                    console.log("user :" + req.header('user')+ "token :" + req.header('token')+"admin :" + req.header('admin'));
                    console.log("Params: " + JSON.stringify(req.params));
                    return next();
                });

                /* User-defined middleware start */
                
                /* Requires TEMP token */
                //called upon login
                that.rest.post('/api/authenticate', allowTempToken, RouteHandler.authenticateGithub);
                
                /* Requires STUDENT OR ADMIN token */
                //called after submitting registration
                //TODO: what's stopping an admin from calling this?
                that.rest.post('/api/register', checkToken, RouteHandler.registerAccount);
                //called upon arriving at student portal
                that.rest.post('/api/getStudent', checkToken, RouteHandler.getStudent);
                that.rest.post('/api/getDeliverables', checkToken, RouteHandler.getDeliverables);
                that.rest.post('/api/getGrades', checkToken, RouteHandler.getGrades);
                //called by logout button
                that.rest.post('/api/logout', checkToken, RouteHandler.deleteServerToken);
                
                /* Requires ADMIN token */
                that.rest.post('/api/getGradesAdmin', requireAdmin, checkToken, RouteHandler.getAllGrades);
                
                //serve static css and js files
                that.rest.get(/\w+\.[jc]ss?/, restify.serveStatic({
                    directory: __dirname.substring(0, __dirname.lastIndexOf("/src")) + '/frontend/public',
                    default: 'index.html'
                }));
                                
                //otherwise, serve index.html and let the react router decide how to render the route
                that.rest.get(/^((?!\.).)*$/, restify.serveStatic({
                    directory: __dirname.substring(0, __dirname.lastIndexOf("/src")) + '/frontend/public',
                    file: 'index.html'
                }));

                that.rest.listen(that.port, function () {
                    Log.info('Server::start() - restify listening: ' + that.rest.url);
                    fulfill(true);
                });
            } catch (err) {
                reject(err);
            }
        });
    }
}

function allowTempToken(req: restify.Request, res: restify.Response, next: restify.Next) {
    Log.trace("checkTempToken| Checking token..");

    var user: string = req.header('user');
    var token: string = req.header('token');
    
    //check that user & token fields are both set to "temp"
    if (user == "temp" && token == "temp") {
        Log.trace("checkTempToken| Valid temp request! Continuing to authentication..");
        Log.trace("");
        return next();
    }
    else {
        Log.trace("checkTempToken| Error: Bad request. Returning..");
        res.send(500, "bad request");
        return;
    }
}

//only calls next middleware if valid admin field is true
function requireAdmin(req: restify.Request, res: restify.Response, next: restify.Next) {
    Log.trace("requireAdmin| Checking admin status..");

    var user: string = req.header('user');
    var token: string = req.header('token');
    var admin: string = req.header('admin')
    
    if (!!user && (admin == "true")) {
        Log.trace("requireAdmin| Valid admin field. Continue to next middleware..\n");
        next();    
    }
    else {
        Log.trace("requireAdmin| Missing admin field. Returning..");
        next(new Error("Error: Permission denied."));
    }
}

//calls next middleware if valid user + token fields are supplied.
//can be called by both regular users (students) and admins.
function checkToken(req: restify.Request, res: restify.Response, next: restify.Next) {
    Log.trace("checkToken| Checking token..");
    
    var user: string = req.header('user');
    var token: string = req.header('token');
    var admin: string = req.header('admin');
    
    Log.trace("checkToken| auths: " + user + ":" + token + ":" + admin);

    //check that user & token fields are non-empty
    if (!!user && !!token) {
        //evaluate token and continue to next middleware if match
        RouteHandler.returnFile("tokens.json", function (response: any) {
            console.log("file:");
            var file = JSON.parse(response);
            var servertoken: string;
            
            //get saved token
            if (admin == "true")
                servertoken = file.admins[user];
            else
                servertoken = file.students[user];
            
            //the next middleware called can be accessed by both students and admins alike.
            if (!!servertoken && (token == servertoken)) {
                Log.trace("checkToken| Tokens match! Continuing to next middleware..\n");
                return next();
            }
            else {
                Log.trace("checkToken| Error: Tokens do not match (" + token + ":" + servertoken + ") Returning..");
                res.send(500, "bad request");
                return;
            }
        });
    }
    else {
        Log.trace("checkToken| Error: Bad request. Returning..");
        res.send(500, "bad request");
        return;
    }
}

/*  Unused

//restify.CORS.ALLOW_HEADERS.push('authorization');
//that.rest.use(restify.CORS());
//rest.pre(restify.pre.sanitizePath());
//rest.use(restify.acceptParser(rest.acceptable));
that.rest.use(restify.bodyParser());
// rest.use(restify.queryParser());
//rest.use(restify.authorizationParser());
//rest.use(restify.fullResponse());                


// clear; curl -is  http://localhost:4321/echo/foo
that.rest.get('/echo/:message', RouteHandler.getEcho);

// clear; curl -is -X PUT -d '{"key":"val","key2":"val2"}' http://localhost:3031/say/randomKey67
// rest.put('/say/:val', portal.rest.RouteHandler.putSay);

// clear; curl -is  http://localhost:4321/students
that.rest.get('/api/students', RouteHandler.getStudents);

//get, add, update, delete students
that.rest.get('/api/students/:id', RouteHandler.getStudentById);
that.rest.post('/api/students', RouteHandler.createStudent);
//that.rest.put('/api/students/:id', RouteHandler.updateStudent);
that.rest.del('/api/students/:id', RouteHandler.deleteStudent);

*/