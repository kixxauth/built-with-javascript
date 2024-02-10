Database Server
===============

A database management system exposed through an HTTP API. Exposes an API which takes aspects from the JSON API specification and CouchDB views for indexing and aggregation.

Possible Implementations
------------------------

__All in runtime memory__

All data is held in Node.js or Dino runtime memory.

- Not durable - would need to be backed up in real time.
- Could quickly run into scale issues with limits on runtime memory.

__Indexes in runtime memory - document storage on S3__

- Will eventually run into scale issues with in-memory indexes.
- Batch requests would open too many sockets

Indexes could be cached on disk when not in use. The system would need to read in the index to update it. This would cause some latency.

__Indexes in runtime memory - document storage in DynamoDB__

- Implementing indexes (map/reduce views) in memory is much easier than over network or on disk
- DynamoDB supports batch requests for documents which limits the number of open sockets
- There will be a performance hit because of open network sockets and JSON parsing/serialization

The additional latency is probably ok, since we have such good caching in the content management system.

- As the size of the indexes grows out of control, they could be moved to a DynamoDB index table.
- When the cost of DynamoDB socket connections and JSON processing becomes too much, we could scale linearly across a cluster of peer nodes behind a load balancer.
- At that point, we could alterntively build out our own system, perhaps from CouchDB or Redis (or both), or our own proprietary system to squeeze more out of vertical scaling.
