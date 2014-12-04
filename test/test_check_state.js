/* global require console process describe it */

var should = require('should')
var checker = require('../.')
var path    = require('path')
var rootdir = path.normalize(__dirname)
var config_okay = require('config_okay')
var config_file = rootdir+'/../test.config.json'
var queue = require('queue-async')
var superagent = require('superagent')
var fs = require('fs')
var testjson = rootdir+'/801230.json'
var testattch = rootdir+'/801230_2008_001.png'

var config

function create_tempdb(cb){
    var date = new Date()
    var test_db_unique = [config.couchdb.db,
                          date.getHours(),
                          date.getMinutes(),
                          date.getSeconds(),
                          date.getMilliseconds()].join('-')
    config.couchdb.db = test_db_unique
    var cdb =
        [config.couchdb.url+':'+config.couchdb.port
        ,config.couchdb.db].join('/')

    superagent.put(cdb)
    .type('json')
    .auth(config.couchdb.auth.username
         ,config.couchdb.auth.password)
    .end(function(err,result){
        if(result.error){
            // do not delete if we didn't create
            config.delete_db=false
        }else{
            config.delete_db=true
        }
        return cb()
    })
    return null
}

function populate_tempdb(cb){
    var cdb =
        [config.couchdb.url+':'+config.couchdb.port
        ,config.couchdb.db].join('/')
    queue(1)
    .defer(function(cb2){
        var stream = fs.createReadStream(testjson);
        var req = superagent.put(cdb+'/801230')
                  .set('Content-Type', 'application/json')
        stream.pipe.req;
        stream.on('end',function(){
            return cb2()
        })
    })
    .defer(function(cb2){
        var stream = fs.createReadStream(testattch);
        var req = superagent.put(cdb+'/801230/801230_2008_001.png')
                  .set('Content-Type', 'image/png')
        stream.pipe.req;
        stream.on('end',function(){
            return cb2()
        })
    })
    .await(function(e){
        should.not.exist(e)
        return cb()
    })
}

before(function(done){

    config_okay(config_file,function(err,c){
        config=c
        if(!c.couchdb.db){ throw new Error('need valid db defined in test.config.json')}
        queue(1)
        .defer(create_tempdb,config)
        .defer(populate_tempdb)
        .await(done)
        return null
    })
    return null
})

after(function(done){

    var cdb =
        config.couchdb.url+':'+config.couchdb.port
             + '/'+ config.couchdb.db
    if(config.delete_db && false){
        superagent.del(cdb)
        .type('json')
        .auth(config.couchdb.auth.username
             ,config.couchdb.auth.password)
        .end(function(e,r){
            return done()
        })
        return null
    }else{
        console.log("not deleting what I didn't create:" + cdb)
        return done()
    }
})


describe('get vds id states',function(){
    it('should get chain lengths state for 801230, 2007'
      ,function(done){
           checker({'db':'vdsdata%2ftracking'
                   ,'doc':801230
                   ,'year':2008
                   ,'state':'vdsraw_chain_lengths'}
                  ,function(err,state){
                       should.not.exist(err)
                       state.should.have.property('length',5)
                       state.should.eql([11,23,19,22,15])
                       return done()
                   })
       });
    it('should get _attachments in place of year attachment for state'
      ,function(done){
           checker({'db':'vdsdata%2ftracking'
                   ,'doc':801230
                   ,'year':'_attachments'
                   ,'state':'801230_2008_001.png'}
                  ,function(err,state){
                       should.not.exist(err)
                       should.exist(state)
                       state.should.have.property('digest','md5-vaA0Xy7cpmyz1/1eWzZI+Q==')
                       return done()
                   })
       });
    it('should not get a missing attachment state'
      ,function(done){
           checker({'db':'vdsdata%2ftracking'
                   ,'doc':801230
                   ,'year':'_attachments'
                   ,'state':'801230_2008_raw_004.png'}
                  ,function(err,state){
                       should.not.exist(err)
                       should.not.exist(state)
                       return done()

                   })
       });
})
