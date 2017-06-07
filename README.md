# Couch Check State

[![Greenkeeper badge](https://badges.greenkeeper.io/jmarca/couch_check_state.svg)](https://greenkeeper.io/)

This is a small package that uses superagent to access "state" stored
in CouchDB.  What I often do is to use a CouchDB database as a way to
store state across machines.  For example, I might stash that a
detector is being processed, or that a detector has completed a step
in its processing.

The basic idea is that a document holds all of the information for a
particular detector, but that the detector might have multiple years
of processing (or months or whatever).  So the structure of the doc
might look like:

```json
{
   "_id": "801230",
   "_rev": "99-7ce940b60ed44a6ad07e6b5b21b4cc01",
   "2010": {
   },
   "2009": {
   },
   "2008": {
       "wim_neigbors_ready": {
           "direction": "west",
           "wim_id": 78,
           "distance": 18339
       },
       "vdsdata": "0",
       "occupancy_averaged": 1,
       "wim_neigbors": {
           "direction": "west",
           "wim_id": 78,
           "distance": 18339
       },
       "vdsraw_chain_lengths": [
           11,
           23,
           19,
           22,
           15
       ],
       "vdsimputed": 1,
       "truckimputation_max_iterations": 0,
       "csv_parse_2cdb": {
           "58cc79c6ebc92027a1a23da619932287": {
               "records": 35136,
               "file": "/data/wim/vds_id.801230.truck.imputed.2008.csv"
           },
           "375a3024b7049e75aadb6dddbaddd9fc": {
               "records": 175680,
               "file": "./imputed/vds_id.801230.truck.imputed.2008.csv"
           },
           "437944d40c7396e95a25ad7162ee64fe": {
               "records": 8784,
               "file": "/var/lib/data/imputed/vds_id.801230.truck.imputed.2008.csv"
           },
           "3437fe0a243bcdf6c07a5fc684abbb83": {
               "records": 35136,
               "file": "/data/wim/vds_id.801230.truck.imputed.2008.csv.gz"
           }
       },
       "csv_parse": {
           "58cc79c6ebc92027a1a23da619932287": "/data/wim/vds_id.801230.truck.imputed.2008.csv",
           "records": 35136,
           "437944d40c7396e95a25ad7162ee64fe": "Rwork/imputed/vds_id.801230.truck.imputed.2008.csv"
       },
       "rawdata": "1",
       "row": 1,
       "truckimputation_chain_lengths": [
           75,
           76,
           91,
           83,
           70
       ],
       "truckimputed": "2012-01-31b finished",
       "vdsraw_max_iterations": 0
   },
   ...
```

In such a case, one might want to know the state of
`vdsraw_chain_lengths` for 2008, say to test whether any are greater
than 5, or for 2009, so see if that process has even been run.

This library helps with that.  To get 2010's `vdsraw_chain_length`
entry, you would do something like this:


``` javascript

var checker = require('couch_check_state')
checker({'db':'vdsdata%2ftracking'
         ,'doc':vdsid
         ,'year':yr
         ,'state':'vdsraw_chain_lengths'}
         ,function(err,state){
             if(err) throw new Error(err)
             if(state.length<5){
                 do_raw_imputations(vdsid)
             }
             return null;
         })

```
