/*
 * Copyright 2015 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function exit() {
  process.exit(0);
}

function stop(e) {
  if (e) {
    console.log('Error:', e);
  }

  if (sparkContext) {
    sparkContext.stop().then(exit).catch(exit);
  }
}

var spark = require('../../lib/index.js');

var kafkaHost = '192.168.99.100:2181';
var topic = 'tlog';

var sparkContext = new spark.SparkContext("local[*]", "Kafak Word Count");
var ssc = new spark.streaming.StreamingContext(sparkContext, new spark.streaming.Duration(2000));

var messages = spark.streaming.kafka.KafkaUtils.createStream(ssc, kafkaHost, topic, {topic: 2});

var lines = messages.map(function(tuple2) {
  return tuple2[1];
});

var words = lines.flatMap(function( x) {
  return x.split(/\s+/);
});

var wordCounts = words.mapToPair(function(s, Tuple) {
  return new Tuple(s, 1);
}, [spark.Tuple]).reduceByKey(function( i1,  i2) {
  return i1 + i2;
});

wordCounts.foreachRDD(function(rdd) {
  var d = rdd.collect().then(function (results) {
    console.log('res:',results);
  });
}).then(function() {
  ssc.start();
  //ssc.awaitTermination();
}).catch(stop);

// stop spark streaming when we stop the node program
process.on('SIGTERM', stop);
process.on('SIGINT', stop);