/* global require console process describe it */

var should = require('should')
var checker = require('../.')
var path    = require('path')
var rootdir = path.normalize(__dirname)
var config_okay = require('config_okay')
var config_file = rootdir+'/../test.config.json'
var queue = require('queue-async')
var request = require('request')
var fs = require('fs')
var testjson = rootdir+'/files/801230.json'
var testattch = rootdir+'/files/801230_2008_001.png'
var _ = require('lodash')
var config

var headers = {
    'content-type': 'application/json',
    accept: 'application/json'
};

var cdb

function create_tempdb(cb){
    var date = new Date()
    var test_db_unique = [config.couchdb.db,
                          date.getHours(),
                          date.getMinutes(),
                          date.getSeconds(),
                          date.getMilliseconds()].join('-')
    config.couchdb.db = test_db_unique
    cdb ='http://'+
        [config.couchdb.host+':'+config.couchdb.port
        ,config.couchdb.db].join('/')
    request.put(cdb,{
        headers:headers,
        auth:{user:config.couchdb.auth.username,
              pass:config.couchdb.auth.password,
              'sendImmediately': false}
    },
                function(e,r,b){
                if(r.error){
                    // do not delete if we didn't create
                    config.delete_db=false
                }else{
                    config.delete_db=true
                }
                //console.log(result.text)
                return cb()
            })
    return null
}

var cdb
function populate_tempdb(cb){
    // console.log('populating test db')
    var cdb ='http://'+
        [config.couchdb.host+':'+config.couchdb.port
        ,config.couchdb.db].join('/')
    // console.log(cdb)
    var docversion=''
    queue(1)
    .defer(fs.readFile,testjson)
    .await(function(e,data){
        var obj = JSON.parse(data)
        var url = cdb+'/801230'
        request({method:'PUT',
                 headers:headers,
                 url:url,
                 json:obj}
               ,function(e,r,b){
                    // console.log(b)
                    docversion = b.rev
                    queue()
                    .defer(function(cb3){
                        // console.log('populating test db with png attachment')
                        //console.log(res)

                        var readstream = fs.createReadStream(testattch)
                        var url = cdb+'/801230/801230_2008_001.png'
                        url+='?rev='+docversion

                        //console.log(url)
                        ///var revision = docversion
                        var rq = request.put(url,
                                             {headers:{'content-type':'image/png'}},
                                             function(e,r,b){

                                                 cb3(null,r)

                                             })

                        readstream.pipe(rq)

                    })
                    .await(function(e){
                        // console.log('both done')
                        should.not.exist(e)
                        return cb()
                    })

                })
    })
}

before(function(done){

    config_okay(config_file,function(err,c){
        config=c
        if(!c.couchdb.db){ throw new Error('need valid db defined in test.config.json')}
        queue(1)
        .defer(create_tempdb)
        .defer(populate_tempdb)
        .await(done)
        return null
    })
    return null
})

after(function(done){

    if(config.delete_db){
        request.del(cdb,{
            headers:headers,
            auth:{user:config.couchdb.auth.username,
                  pass:config.couchdb.auth.password,
                  'sendImmediately': false}
        }
                   ,done)
        return null
    }else{
        console.log("not deleting what I didn't create:" + cdb)
        return done()
    }
})


describe('get vds id states',function(){
    it('should get chain lengths state for 801230, 2007'
      ,function(done){
           checker(_.assign({},config.couchdb,
                            {'doc':801230
                            ,'year':2008
                            ,'state':'vdsraw_chain_lengths'})
                  ,function(err,state){
                       should.not.exist(err)
                       state.should.have.property('length',5)
                       state.should.eql([11,23,19,22,15])
                       return done()
                   })
       });
    it('should get _attachments in place of year attachment for state'
      ,function(done){
           checker(_.assign({},config.couchdb,
                            {'doc':801230
                            ,'year':'_attachments'
                            ,'state':'801230_2008_001.png'}
                           )
                  ,function(err,state){
                       should.not.exist(err)
                       should.exist(state)
                       state.should.have.property('digest','md5-wHfu6lFU9n1SHA9YykbyXQ==')
                       return done()
                   })
       });
    it('should not get a missing attachment state'
      ,function(done){
           checker(_.assign({},config.couchdb,
                            {'doc':801230
                            ,'year':'_attachments'
                            ,'state':'801230_2008_raw_004.png'})
                  ,function(err,state){
                       should.not.exist(err)
                       should.not.exist(state)
                       return done()

                   })
       });
})
