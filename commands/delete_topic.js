'use strict';

let zookeeper = require("node-zookeeper-client");
let cli = require('heroku-cli-util');
let co = require('co');
let checkValidTopicNameForDeletion = require('./shared').checkValidTopicNameForDeletion;

function* deleteTopic (context, heroku) {
    let config = yield heroku.apps(context.app).configVars().info();
    let zookeeperURL = config['HEROKU_KAFKA_ZOOKEEPER_URL'].replace(/zk:\/\//g,'');
    let topicName = context.flags.topic;
    let partitionCount = context.flags.partitions;

    let client = zookeeper.createClient(zookeeperURL);
    client.once('connected', function () {
      client.getChildren("/brokers/topics", function (error, existingTopics) {
        let validTopic = checkValidTopicNameForDeletion(topicName, existingTopics);
        if (validTopic.invalid) {
          cli.error("topic name " + topicName + " was invalid: " + validTopic.message);
          client.close()
          process.exit(1);
        } else {
          client.create("/admin/delete_topics/" + topicName, function (error) {
            if (error) {
              cli.error(error);
            }
            console.log("marked " + topicName + " for deletion");
            client.close()
          });
        }
      });
    });
    client.connect();
}

module.exports = {
  topic: 'kafka',
  command: 'delete-topic',
  description: 'deletes a topic in kafka',
  help: '',
  needsApp: true,
  needsAuth: true,
  flags: [
    {name: 'topic', char: 't', description: 'topic name to delete', hasValue: true, optional: false},
  ],
  run: cli.command(co.wrap(deleteTopic)),
}