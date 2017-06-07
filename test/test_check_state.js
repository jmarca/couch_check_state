/* global require console process describe it */

const tap = require('tap')

const checker = require('../.')
const path    = require('path')
const rootdir = path.normalize(__dirname)
const config_okay = require('config_okay')
const config_file = rootdir+'/../test.config.json'

const request = require('request')
const denodeify = require('denodeify')
const fs = require('fs')
const readFile = denodeify(fs.readFile);
const testjson = rootdir+'/files/801230.json'
const testattch = rootdir+'/files/801230_2008_001.png'

const config = {}

const headers = {
    'content-type': 'application/json',
    accept: 'application/json'
};

let cdb

function create_tempdb(config,cb){
    const date = new Date()
    const test_db_unique = [config.couchdb.db,
                          date.getHours(),
                          date.getMinutes(),
                          date.getSeconds(),
                          date.getMilliseconds()].join('-')
    config.couchdb.db = test_db_unique
    cdb ='http://'+
        [config.couchdb.host+':'+config.couchdb.port
        ,config.couchdb.db].join('/')
    request.put(
        cdb,
        {
            headers:headers,
            auth:{'user':config.couchdb.auth.username
                  ,'pass':config.couchdb.auth.password
                  //,'sendImmediately': false // apparently breaks couch 1.6.1
                 }
        },
        function(e,r,b){
            //console.log('create db, e',e)
            //console.log('create db, r',r)
            //console.log('create db, b',b)
            return cb()
        }
               )
    return null
}

function populate_db(config,cb){
    // console.log('populating test db')
    const cdb ='http://'+
        [config.couchdb.host+':'+config.couchdb.port
        ,config.couchdb.db].join('/')
    // console.log(cdb)
    let docversion=''

    return readFile(testjson)
        .then( data => {
            const obj = JSON.parse(data)
            let url = cdb+'/801230'
            request({method:'PUT',
                     headers:headers,
                     url:url,
                     json:obj}
                    ,function(e,r,b){
                        // console.log(b)
                        docversion = b.rev
                        // console.log('populating test db with png attachment')
                        //console.log(res)

                        const readstream = fs.createReadStream(testattch)
                        url = cdb+'/801230/801230_2008_001.png'
                        url+='?rev='+docversion

                        //console.log(url)
                        ///const revision = docversion
                        const rq = request.put(url,
                                             {headers:{'content-type':'image/png'}},
                                               function(e,r,b){

                                                   return cb(e,b)
                                             })

                        readstream.pipe(rq)
                        return null
                    })
            return null
        })
}





function teardown(config,done){

    request.del(cdb,{
        headers:headers,
        auth:{user:config.couchdb.auth.username,
              pass:config.couchdb.auth.password,
              'sendImmediately': false}
    }
                ,done)
    return null
}


function get_states(t){
    t.plan(3)
    return t.test('should get chain lengths state for 801230, 2007',tt=>{
        tt.plan(2)
        const task = Object.assign({}
                                   ,config.couchdb
                                   ,{'doc':801230
                                     ,'year':2008
                                     ,'state':'vdsraw_chain_lengths'})


        checker(task,function(err,state){
            tt.notOk(err,'should not get error on checker')
            tt.same(state,[11,23,19,22,15])
            return tt.end()
        })
    })
        .then(t=>{
            return t.test('should get _attachments in place of year attachment for state',tt=>{

                tt.plan(5)
                const task = Object.assign({}
                                           ,config.couchdb
                                           ,{'doc':801230
                                             ,'year':'_attachments'
                                             ,'state':'801230_2008_001.png'
                                            })

                checker(task,function(err,state){
                    tt.notOk(err,'should not get error on checker')
                    tt.ok(state)
                    tt.ok(state.digest)
                    //console.log(state)
                    tt.is(state.length,457596,'expected file length')
                    const wantdigest = "md5-wHfu6lFU9n1SHA9YykbyXQ=="
                    tt.is(state.digest,wantdigest,'matched md5 digests')
                    return tt.end()
                })
                return null
            })
        })
        .then(t=>{
            return t.test('should not get a missing attachment state',tt=>{
                tt.plan(2)
                const task = Object.assign({}
                                           ,config.couchdb
                                           ,{'doc':801230
                                             ,'year':'_attachments'
                                             ,'state':'801230_2008_raw_004.png'})

                checker(task,function(err,state){
                    tt.notOk(err,'should not get error on checker')
                    tt.notOk(state,'should not get non-existent state')
                    return tt.end()
                })
                return null
            })
        })
        .then(t=>{
            return t.end()
        })

}

function check_existence(t){
    t.plan(2)
    return t.test('should get the rev for 801230',tt=>{
        tt.plan(3)
        const task = Object.assign({}
                                   ,config.couchdb
                                   ,{'doc':801230}
                                  )

        checker.check_exists(task,function(err,rev){
            tt.notOk(err,'should not fail check exist')
            tt.ok(rev,'should get doc revision')
            tt.ok(/\d+-\w+/.test(rev),'expect a format for revision')
            return tt.end()
        })
    })
        .then(t=>{
            return t.test('should not get the revision for a non-doc',tt=>{
                tt.plan(2)
                const task = Object.assign({}
                                           ,config.couchdb
                                           ,{'doc':123456789}
                                          )

                checker.check_exists(task,function(err,rev){
                    tt.notOk(err,'should not fail check exist')
                    tt.notOk(rev,'should not have doc revision')
                    return tt.end()
                })
            })
        })
        .then(t=>{
            return t.end()
        })
}

config_okay(config_file)
    .then( c => {
        config.couchdb=c.couchdb
        if(!config.couchdb.db){ throw new Error('need valid db defined in test.config.json')}
        create_tempdb(config,function(e,r){
            if(e) throw e
            populate_db(config,function(ee,rr){
                return tap.test('check_existence',check_existence)
                    .then( function() {
                        return tap.test('get vds id states',get_states)
                            .then(function(){
                                teardown(config,function(eee,rrr){
                                    return tap.end()
                                })
                                return null
                            })
                            .catch( e => {
                                console.log('testing error', e)
                                throw e
                            })
                    })
                    .catch( e => {
                        console.log('testing error', e)
                        throw e
                    })
            })
            return null
        })
        return null
    })
    .catch( e => {
        throw e
    })
