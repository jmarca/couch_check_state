var superagent = require('superagent')
var server = process.env.COUCHDB_HOST || 'localhost'
var port = process.env.COUCHDB_PORT || 5984
var couchdb = 'http://'+server+':'+port
//console.log(couchdb)
/**
 * couchdb_check_state(opts,cb)
 * opts = {'db': the couchdb holding the document,
 *         'doc': the document holding the state,
 *         'year': the year to check (any sub key in the doc, really),
 *         'state': the state to get from the doc under the 'year' key,
 * }
 * cb = a callback
 *
 * cb will be called as cb(error,value)
 *
 * The error will contain any error passed from accessing couchdb
 *
 * The value can be null if there is nothing in the document, or will
 * equal the value of doc[year][state]
 *
 * in a special case, if there is doc[state], but nothing at doc[year]
 * and/or if opts.year is not defined, then I will return doc[state]
 *
 * So for example, if you want to check 'rawimpute' in the year 2008
 * for detector 1212432, in a couchdb called 'tracking', you would
 * call with
 *
 * {'db':'tracking',doc':'1212432','year':2008,'state':'rawimpute'}
 *
 * If you want to check 'rawimpute' in the year 2008 for detector
 * 1212432, in a couchdb database named vds_detector/tracking/D12, you
 * could call with
 *
 * {'db':'vds_detector%2ftracking%2f/D12','doc':'1212432',
 *  'year':2008,'state':'rawimpute'}
 *
 *
 *
 * note that I don't make any assumptions about the db or year, aside
 * from the fact that I expect that there will be a couchdb document
 * with that name.  Typically this means the detector id should
 * resolve to some string.  If you have a couchdb with slashes, you
 * should remember to escape those properly, etc
 *
 * If you pass dbroot, it is presumed that the separator is a slash,
 * and if you don't want that, then do not use dbroot, use a full
 * couchdb name passed as detector_id
 *
 */
function couchdb_check_state(opts,cb){
    var db = opts.db
    var id = opts.doc
    var year = opts.year
    var state = opts.state

    var query = couchdb+'/'+db+'/'+id
    //console.log(query)
    superagent
    .get(query)
    .set('accept','application/json')
    .set('followRedirect',true)
    .end(function(err,res){
        if(err) return cb(err)
        var doc = res.body
        // let state be an array
        var result = []
        var _state = state
        if(! _.isArray(state)){
            _state = [state]
        }
        if(doc[year] === undefined){
            _.each(_state,function(s){
                if(doc[state] === undefined){
                    result.push(null)
                }else{
                    result.push(doc[state])
                }
            })
        }else{
            _.each(_state,function(s){
                if(doc[year][state] === undefined){
                    result.push(null)
                }else{
                    result.push(doc[year][state])
                }
            })
        }
        // if still here, have doc year, but maybe not doc state
        if(result.length === 1) result = result[0]
        return cb(null, result)
    })
}
module.exports=couchdb_check_state
