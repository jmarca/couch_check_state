/* global require console process describe it */

const tap = require('tap')
const utils = require('./utils.js')
const checker = require('../.')
const path    = require('path')
const rootdir = path.normalize(__dirname)
const config_okay = require('config_okay')
const config_file = rootdir+'/../test.config.json'



const config = {}

const headers = {
    'content-type': 'application/json',
    accept: 'application/json'
};

let cdb



function get_states(t){
    t.plan(11)
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
    }).then(t=>{
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
    }).then(t=>{
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
    }).then(t=>{
        return t.test('should not get a missing thinger',tt=>{
            tt.plan(2)
            const task = Object.assign({}
                                       ,config.couchdb
                                       ,{'doc':801230
                                         ,'year':2017
                                         ,'state':'grobble fruit'})

            checker(task,function(err,state){
                tt.notOk(err,'should not get error on checker')
                tt.notOk(state,'should not get non-existent state')
                return tt.end()
            })
            return null
        })
    }).then(t=>{
        return t.test('should not get a state for a missing doc',tt=>{

            tt.plan(3)
            const task = Object.assign({}
                                       ,config.couchdb
                                       ,{'doc':8675309
                                         ,'year':'_attachments'
                                         ,'state':'801230_2008_001.png'
                                        })

            checker(task,function(err,state){
                tt.notOk(state,'should not get state')
                tt.ok(err,'should get an error')
                tt.is(err.status,404,'got status 404')
                return tt.end()
            })
            return null
        })

        // now promise versions of tests
    }).then(t=>{
        return t.test('should get chain lengths state for 801230, 2007, promise version',tt=>{
            tt.plan(1)
            const task = Object.assign({}
                                       ,config.couchdb
                                       ,{'doc':801230
                                         ,'year':2008
                                         ,'state':'vdsraw_chain_lengths'})


            checker(task)
                .then(state =>{
                    tt.same(state,[11,23,19,22,15])
                    return tt.end()
                })
                .catch(err =>{
                    console.log(err)
                    tt.fail('should not fail')
                })
        })
    }).then(t=>{
        return t.test('should get nothing for wim chain lengths state for 801230, 2007, promise version',tt=>{
            tt.plan(1)
            const task = Object.assign({}
                                       ,config.couchdb
                                       ,{'doc':801230
                                         ,'state':'wim_chain_lengths'})


            checker(task)
                .then(state =>{
                    tt.notOk(state,'got empty state')
                    return tt.end()
                })
                .catch(err =>{
                    console.log(err)
                    tt.fail('should not fail')
                })
        })
    }).then(t=>{
        return t.test('should get array of states,promise version',tt=>{
            tt.plan(3)
            const task = Object.assign({}
                                       ,config.couchdb
                                       ,{'doc':801230
                                         ,'state':['latitude_4269','longitude_4269']
                                        })


            checker(task)
                .then(state =>{
                    tt.ok(state,'got empty state')
                    tt.match(state,[],'got an array')
                    tt.same(state,["34.082004","-117.699964"])
                    return tt.end()
                })
                .catch(err =>{
                    console.log(err)
                    tt.fail('should not fail')
                })
        })
    }).then(t=>{
        return t.test('should get _attachments in place of year attachment for state, promise version',tt=>{

            tt.plan(4)
            const task = Object.assign({}
                                       ,config.couchdb
                                       ,{'doc':801230
                                         ,'year':'_attachments'
                                         ,'state':'801230_2008_001.png'
                                        })

            checker(task)
                .then(state =>{
                    tt.ok(state)
                    tt.ok(state.digest)
                    //console.log(state)
                    tt.is(state.length,457596,'expected file length')
                    const wantdigest = "md5-wHfu6lFU9n1SHA9YykbyXQ=="
                    tt.is(state.digest,wantdigest,'matched md5 digests')
                    return tt.end()
                })
                .catch(err =>{
                    console.log(err)
                    tt.fail('should not fail')
                })

            return null
        })
    }).then(t=>{
        return t.test('should not get a missing attachment state, promise version',tt=>{
            tt.plan(1)
            const task = Object.assign({}
                                       ,config.couchdb
                                       ,{'doc':801230
                                         ,'year':'_attachments'
                                         ,'state':'801230_2008_raw_004.png'})

            checker(task)
                .then(state =>{
                    tt.notOk(state,'should not get non-existent state')
                    return tt.end()
                })
                .catch(err =>{
                    console.log(err)
                    tt.fail('should not fail')
                })
            return null
        })
    }).then(t=>{
        return t.test('should not get a state for a missing doc, promise version',tt=>{

            tt.plan(2)
            const task = Object.assign({}
                                       ,config.couchdb
                                       ,{'doc':8675309
                                         ,'year':'_attachments'
                                         ,'state':'801230_2008_001.png'
                                        })

            checker(task)
                .then(state =>{
                    tt.fail('should not get state')
                })
                .catch(err=>{
                    tt.ok(err,'should get an error')
                    tt.is(err.status,404,'got status 404')
                    return tt.end()
                })
            return null
        })
    })

}

function check_existence(t){
    t.plan(4)
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
    }).then(t=>{
        return t.test('should not get the revision for a non-doc',tt=>{
            tt.plan(3)
            const task = Object.assign({}
                                       ,config.couchdb
                                       ,{'doc':123456789}
                                      )

            checker.check_exists(task,function(err,rev){
                tt.ok(err,'should fail check exist')
                tt.is(err.status,404,'got status 404')
                tt.notOk(rev,'should not have doc revision')
                return tt.end()
            })
        })
    }).then(t=>{
        return t.test('should get the rev for 801230, promise version',tt=>{
            tt.plan(2)
            const task = Object.assign({}
                                       ,config.couchdb
                                       ,{'doc':801230}
                                      )

            checker.check_exists(task)
                .then( rev => {
                    tt.ok(rev,'should get doc revision')
                    tt.ok(/\d+-\w+/.test(rev),'expect a format for revision')
                    return tt.end()
                })
                .catch( err =>{
                    tt.fail('should not fail')
                })
        })
    }).then(t=>{
        return t.test('should not get the revision for a non-doc, promise version',tt=>{
            tt.plan(2)
            const task = Object.assign({}
                                       ,config.couchdb
                                       ,{'doc':123456789}
                                      )

            checker.check_exists(task)
                .then(rev =>{
                    tt.fail('should not succeed')
                })
                .catch(err=>{
                    tt.ok(err,'should fail check exist')
                    tt.is(err.status,404,'got status 404')
                    return tt.end()
                })
        })

    })
}

config_okay(config_file)
    .then( async (c) => {
        config.couchdb=c.couchdb
        if(!config.couchdb.db){ throw new Error('need valid db defined in test.config.json')}
        try {
            await utils.create_tempdb(config)
            await utils.populate_db(config)
        } catch (e){
            console.log('failed in create/populate tempdb')
            throw e
        }

        return tap.test('check_existence',check_existence)
            .then( function() {
                return tap.test('get vds id states',get_states)
                    .then(function(){
                        utils.teardown(config,function(eee,rrr){
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
    .then( async () =>{
        await utils.teardown(config)
    })

    .catch( e => {
        console.log('outside test loop, caught',e)
        throw e
    })
