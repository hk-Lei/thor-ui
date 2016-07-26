'use strict';
const groupsNodesFunc = require('../data').groupsNodes;
const nodesGroupsFunc = require('../data').nodesGroups;
const request = require('../util/request');
const fs = require('fs');
const sendEmail = require('../util/sendEmail').sendEmail;


exports.index = (req, res, next) => {
	getAllDatas().then(result => {
		res.render('index.jade', {connectors: global.connectorsRes});
	}).catch(err => next(err));
};
exports.connectors = (req, res, next) => {
	let connectorsRes = global.connectorsRes;

	res.json({connectors: connectorsRes});
};
exports.connector = (req, res, next) => {
	let group = req.query.group;
	let node = req.query.node;
	let connectorsRes = global.connectorsRes;
	//todo: node status
	res.render('connect.jade', {
		group: group,
		nodeCurr: node,
		nodes: connectorsRes[group],
		connectors: connectorsRes[group][node].connectors
	});
};
exports.addNode = (req, res, next) => {
	let group = req.body.group;
	let ip = req.body.ip;
	let port = req.body.port;
	let node = ip + ':' + port;
	
	getDatas([node], [{node: node, name: group}]).then(result => {
		// global.connectorsRes[group][node] = result[group][node];
		let newNode = {status: 0, connectors: {}};
		global.connectorsRes[group][node] = newNode;
		let groups = JSON.parse(fs.readFileSync('groups.json', {encoding: 'utf-8'}));
		groups[group].nodes.push(node);

		fs.writeFile('groups.json', JSON.stringify(groups), (err, results) => {
			if (err) return res.status(500).json({message: 'something is wrong'});
			return res.json({group: group, node: {node: newNode}});
		});
		
	}).catch(err => next(err))
	
	
};

/**groupsNodes:
 * ["101.71.28.131:8183","101.71.28.132:8183",]
 * 
 * nodesGroups:
 * [{node: '',name: 'rtb}]
 * 
 * @param groupsNodes
 * @param nodesGroups
 * @returns {Promise.<TResult>}
 */
function getDatas(groupsNodes, nodesGroups) {
	let connectors = [], connectorsInfos, connectorsStatus;
	let connectorsRes = {};
	
	return Promise.all(groupsNodes.map((item) => {
		return request({
			url: `http://${item}/connectors`,
			method: 'GET',
		});
	})).then(results => {
		/**
		 * results:
		 *    [[a,b],{error: ''},[e,f]]
		 *
		 *
		 * connectorsWithNode:
		 * [{node: '', }]
		 *
		 * nodesGroups:
		 * [{node: '',name: 'rtb}]
		 * nodesGroups[index].connectors:
		 *    [{node: '',name: 'rtb, connectors: [a,b]}]   [{node: '',name: 'rtb, connectors: {error: ''}}]
		 *
		 *    connectors:
		 *        [{node: '', connect: connect, name: nodesGroups[index].name}]
		 */
		results.map(function (item, index) {
			nodesGroups[index].connectors = item;
    
			if (item.error) {
				item = [];
			}
			let connectorsWithNode = item.map(function (connect) {
				return {node: nodesGroups[index].node, connect: connect, name: nodesGroups[index].name}
			});
			connectors = connectors.concat(connectorsWithNode);
		});
    
		return Promise.all(connectors.map((item) => {
			return request({
				url: `http://${item.node}/connectors/${item.connect}/config`,
				method: 'GET',
			});
		}));
	}).then(results => {
		connectorsInfos = results;
		connectorsInfos.map(function (item, index) {
			connectors[index].config = item;
		});
    
		return Promise.all(connectors.map((item) => {
			return request({
				url: `http://${item.node}/connectors/${item.connect}/status`,
				method: 'GET',
			});
		}));
	}).then(results => {
		connectorsStatus = results;
		connectorsStatus.map(function (item, index) {
			connectors[index].tasks = item.tasks;
		});
    
		nodesGroups.map(function (item) {
			connectorsRes[item.name] = connectorsRes[item.name] || {};
			connectorsRes[item.name][item.node] = connectorsRes[item.name][item.node] || {};
			connectorsRes[item.name][item.node].connectors = connectorsRes[item.name][item.node].connectors || {};
			let errStatus = {running:0,paused:0,failed: 0};
			//status: -1: failed, 0: paused, 1:running
			if (item.connectors.error) {
				errStatus.failed ++;		
    
				connectorsRes[item.name][item.node].connectors = {error: item.connectors.error};
			} else {
				connectors.map(function (connector) {
					if (connector.name == item.name && connector.node == item.node) {
						let status = connector.tasks[0].state;
						status === 'RUNNING' ? errStatus.running ++ : (status === 'PAUSED' ?  errStatus.paused ++:  errStatus.failed ++)
    
						connectorsRes[item.name][item.node].connectors[connector.config.name] = {
							config: connector.config,
							tasks: connector.tasks,
							status: status === 'RUNNING' ? 1 : (status === 'PAUSED' ?  0:  -1)
						};
					}
				});
				connectorsRes[item.name][item.node].status = errStatus.failed > 0 ? -1 : (errStatus.paused > 0 ? 0:1)
			}
		});
		/**
		 *  * nodesGroups[index].connectors:
		 *    [{node: '',name: 'rtb, connectors: [a,b]}]   [{node: '',name: 'rtb, connectors: {error: ''}}]
		 *
		 *    connectors:
		 *        [{node: '', connect: connect, name: nodesGroups[index].name}]
		 *    connectorsRes:
		 *    {rtb:{
		 * 		1922: [{config:'',staus: '',tasks: ''}]
		 * 	}}
		 *
		 */
		
		return connectorsRes;
	});
	
	
	// let a = {
	// 	"rtb": {
	// 		"101.71.28.130:8183": {
	// 			"connectors": {
	// 				"adwiser-order": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/ec",
	// 						"file.prefix": "order.",
	// 						"name": "adwiser-order",
	// 						"topic": "adwiser-order"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.1.130:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"adwiser-browse": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/pv",
	// 						"file.prefix": "log.",
	// 						"name": "adwiser-browse",
	// 						"topic": "adwiser-browse"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.1.130:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"adwiser-goods": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/ec_detail",
	// 						"file.prefix": "order.detail.",
	// 						"name": "adwiser-goods",
	// 						"topic": "adwiser-goods"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.1.130:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"adwiser-event": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/event",
	// 						"file.prefix": "event.",
	// 						"name": "adwiser-event",
	// 						"topic": "adwiser-event"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.1.130:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				}
	// 			},
	// 			"status": 1
	// 		},
	// 		"101.71.28.131:8183": {
	// 			"connectors": {
	// 				"adwiser-order1": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/ec",
	// 						"file.prefix": "order.",
	// 						"name": "adwiser-order",
	// 						"topic": "adwiser-order"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.1.131:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"adwiser-browse1": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/pv",
	// 						"file.prefix": "log.",
	// 						"name": "adwiser-browse",
	// 						"topic": "adwiser-browse"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.1.131:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"adwiser-goods1": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/ec_detail",
	// 						"file.prefix": "order.detail.",
	// 						"name": "adwiser-goods",
	// 						"topic": "adwiser-goods"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.1.131:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"adwiser-event1": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/event",
	// 						"file.prefix": "event.",
	// 						"name": "adwiser-event",
	// 						"topic": "adwiser-event"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.1.131:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				}
	// 			},
	// 			"status": 1
	// 		},
	// 		"101.71.28.132:8183": {
	// 			"connectors": {
	// 				"adwiser-order2": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/ec",
	// 						"file.prefix": "order.",
	// 						"name": "adwiser-order",
	// 						"topic": "adwiser-order"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.1.132:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"adwiser-browse2": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/pv",
	// 						"file.prefix": "log.",
	// 						"name": "adwiser-browse",
	// 						"topic": "adwiser-browse"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.1.132:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"adwiser-goods2": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/ec_detail",
	// 						"file.prefix": "order.detail.",
	// 						"name": "adwiser-goods",
	// 						"topic": "adwiser-goods"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.1.132:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"adwiser-event2": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/event",
	// 						"file.prefix": "event.",
	// 						"name": "adwiser-event",
	// 						"topic": "adwiser-event"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.1.132:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				}
	// 			},
	// 			"status": 1
	// 		},
	// 		"123.59.17.184:8183": {
	// 			"connectors": {
	// 				"adwiser-order": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/ec",
	// 						"file.prefix": "order.",
	// 						"name": "adwiser-order",
	// 						"topic": "adwiser-order"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "127.0.0.1:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"adwiser-browse": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/pv",
	// 						"file.prefix": "log.",
	// 						"name": "adwiser-browse",
	// 						"topic": "adwiser-browse"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "127.0.0.1:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"adwiser-goods": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/ec_detail",
	// 						"file.prefix": "order.detail.",
	// 						"name": "adwiser-goods",
	// 						"topic": "adwiser-goods"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "127.0.0.1:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"adwiser-event": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/event",
	// 						"file.prefix": "event.",
	// 						"name": "adwiser-event",
	// 						"topic": "adwiser-event"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "127.0.0.1:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				}
	// 			},
	// 			"status": 1
	// 		},
	// 		"123.59.17.189:8183": {
	// 			"connectors": {
	// 				"adwiser-order": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/ec",
	// 						"file.prefix": "order.",
	// 						"name": "adwiser-order",
	// 						"topic": "adwiser-order"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "123.59.17.189:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"adwiser-browse": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/pv",
	// 						"file.prefix": "log.",
	// 						"name": "adwiser-browse",
	// 						"topic": "adwiser-browse"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "123.59.17.189:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"adwiser-goods": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/ec_detail",
	// 						"file.prefix": "order.detail.",
	// 						"name": "adwiser-goods",
	// 						"topic": "adwiser-goods"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "123.59.17.189:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"adwiser-event": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/data/provide/event",
	// 						"file.prefix": "event.",
	// 						"name": "adwiser-event",
	// 						"topic": "adwiser-event"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "123.59.17.189:8183"
	// 						}
	// 					],
	// 					"status": 1
	// 				}
	// 			},
	// 			"status": 1
	// 		},
	// 		"101.222.222.11:1111": {
	// 			"connectors": {
	// 				"error": {
	// 					"code": "ETIMEDOUT",
	// 					"connect": true
	// 				}
	// 			}
	// 		},
	// 		"111.111.111.113:0001": {
	// 			"connectors": {
	// 				"error": {
	// 					"code": "ETIMEDOUT",
	// 					"connect": true
	// 				}
	// 			}
	// 		},
	// 		"101.222.222.14:2": {
	// 			"connectors": {
	// 				"error": {
	// 					"code": "ETIMEDOUT",
	// 					"connect": true
	// 				}
	// 			}
	// 		}
	// 	},
	// 	"bs": {
	// 		"101.71.28.133:8184": {
	// 			"connectors": {
	// 				"bs-monitor-web": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/dsp/app/dmpdata",
	// 						"file.suffix": ".dat",
	// 						"file.prefix": "dspmn_monitor_",
	// 						"name": "bs-monitor-web",
	// 						"is.recusive.dir": "true",
	// 						"topic": "bs-monitor-web"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.1.133:8184"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"bs-monitor-click-mobile": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"tasks.max": "1",
	// 						"topic": "bs-monitor-click-mobile",
	// 						"path": "/data/dsp/app/dmpdata_mobile",
	// 						"is.recusive.dir": "true",
	// 						"file.prefix": "c_dspmn_monitor_",
	// 						"file.suffix": ".dat",
	// 						"name": "bs-monitor-click-mobile"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.1.133:8184"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"bs-monitor-imp-mobile": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"tasks.max": "1",
	// 						"topic": "bs-monitor-imp-mobile",
	// 						"path": "/data/dsp/app/dmpdata_mobile",
	// 						"is.recusive.dir": "true",
	// 						"file.prefix": "i_dspmn_monitor_",
	// 						"file.suffix": ".dat",
	// 						"name": "bs-monitor-imp-mobile"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.1.133:8184"
	// 						}
	// 					],
	// 					"status": 1
	// 				}
	// 			},
	// 			"status": 1
	// 		},
	// 		"101.71.28.137:8184": {
	// 			"connectors": {
	// 				"bs-monitor-web": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/dsp/app/dmpdata",
	// 						"file.suffix": ".dat",
	// 						"file.prefix": "dspmn_monitor_",
	// 						"name": "bs-monitor-web",
	// 						"is.recusive.dir": "true",
	// 						"topic": "bs-monitor-web"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.1.137:8184"
	// 						}
	// 					],
	// 					"status": 1
	// 				}
	// 			},
	// 			"status": 1
	// 		},
	// 		"123.59.17.180:8184": {
	// 			"connectors": {
	// 				"bs-monitor-web": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/dsp/app/dmpdata",
	// 						"file.suffix": ".dat",
	// 						"file.prefix": "dspmn_monitor_",
	// 						"name": "bs-monitor-web",
	// 						"is.recusive.dir": "true",
	// 						"topic": "bs-monitor-web"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "127.0.0.1:8184"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"bs-monitor-click-mobile": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"tasks.max": "1",
	// 						"topic": "bs-monitor-click-mobile",
	// 						"path": "/data/dsp/app/dmpdata_mobile",
	// 						"is.recusive.dir": "true",
	// 						"file.prefix": "c_dspmn_monitor_",
	// 						"file.suffix": ".dat",
	// 						"name": "bs-monitor-click-mobile"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "127.0.0.1:8184"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"bs-monitor-imp-mobile": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"tasks.max": "1",
	// 						"topic": "bs-monitor-imp-mobile",
	// 						"path": "/data/dsp/app/dmpdata_mobile",
	// 						"is.recusive.dir": "true",
	// 						"file.prefix": "i_dspmn_monitor_",
	// 						"file.suffix": ".dat",
	// 						"name": "bs-monitor-imp-mobile"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "127.0.0.1:8184"
	// 						}
	// 					],
	// 					"status": 1
	// 				}
	// 			},
	// 			"status": 1
	// 		}
	// 	},
	// 	"adwiser": {
	// 		"123.59.17.153:8185": {
	// 			"connectors": {
	// 				"rtb-request-mobile": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/rtb/adex_log_sev/data",
	// 						"file.suffix": ".dat",
	// 						"file.prefix": "rtb_mobilerequest_",
	// 						"name": "rtb-request-mobile",
	// 						"topic": "rtb-request-mobile"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "127.0.0.1:8185"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"rtb-camp-mobile": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/rtb/adex_log_sev/data",
	// 						"file.suffix": ".dat",
	// 						"file.prefix": "rtb_mobileresponse_",
	// 						"name": "rtb-camp-mobile",
	// 						"topic": "rtb-camp-mobile"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "127.0.0.1:8185"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"rtb-camp-pc": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/rtb/adex_log_sev/data",
	// 						"file.suffix": ".dat",
	// 						"file.prefix": "i_rtb_biddetail_",
	// 						"name": "rtb-camp-pc",
	// 						"topic": "rtb-camp-pc"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "127.0.0.1:8185"
	// 						}
	// 					],
	// 					"status": 1
	// 				}
	// 			},
	// 			"status": 1
	// 		},
	// 		"123.59.17.154:8185": {
	// 			"connectors": {
	// 				"rtb-request-mobile": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/rtb/adex_log_sev/data",
	// 						"file.suffix": ".dat",
	// 						"file.prefix": "rtb_mobilerequest_",
	// 						"name": "rtb-request-mobile",
	// 						"topic": "rtb-request-mobile"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.6.154:8185"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"rtb-camp-mobile": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/rtb/adex_log_sev/data",
	// 						"file.suffix": ".dat",
	// 						"file.prefix": "rtb_mobileresponse_",
	// 						"name": "rtb-camp-mobile",
	// 						"topic": "rtb-camp-mobile"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.6.154:8185"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"rtb-camp-pc": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/rtb/adex_log_sev/data",
	// 						"file.suffix": ".dat",
	// 						"file.prefix": "i_rtb_biddetail_",
	// 						"name": "rtb-camp-pc",
	// 						"topic": "rtb-camp-pc"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "192.168.6.154:8185"
	// 						}
	// 					],
	// 					"status": 1
	// 				}
	// 			},
	// 			"status": 1
	// 		},
	// 		"123.59.17.172:8185": {
	// 			"connectors": {
	// 				"rtb-request-mobile": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/rtb/adex_log_sev/data",
	// 						"file.suffix": ".dat",
	// 						"file.prefix": "rtb_mobilerequest_",
	// 						"name": "rtb-request-mobile",
	// 						"topic": "rtb-request-mobile"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "127.0.0.1:8185"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"rtb-camp-mobile": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/rtb/adex_log_sev/data",
	// 						"file.suffix": ".dat",
	// 						"file.prefix": "rtb_mobileresponse_",
	// 						"name": "rtb-camp-mobile",
	// 						"topic": "rtb-camp-mobile"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "127.0.0.1:8185"
	// 						}
	// 					],
	// 					"status": 1
	// 				},
	// 				"rtb-camp-pc": {
	// 					"config": {
	// 						"connector.class": "com.emar.kafka.connect.FileStreamSource",
	// 						"path": "/data/rtb/adex_log_sev/data",
	// 						"file.suffix": ".dat",
	// 						"file.prefix": "i_rtb_biddetail_",
	// 						"name": "rtb-camp-pc",
	// 						"topic": "rtb-camp-pc"
	// 					},
	// 					"tasks": [
	// 						{
	// 							"state": "RUNNING",
	// 							"id": 0,
	// 							"worker_id": "127.0.0.1:8185"
	// 						}
	// 					],
	// 					"status": 1
	// 				}
	// 			},
	// 			"status": 1
	// 		}
	// 	}
	// }
	// return new Promise((resolve, reject) =>{
	// 	resolve(a);
	// 	});
}
const getAllDatas = function () {
	return getDatas(groupsNodesFunc(), nodesGroupsFunc()).then(result => {
		global.connectorsRes = result;
		let errNodes = [];
		for(let item in result){
			let nodes = result[item];
			for(let node in nodes){
				if(result[item][node].status !== 1){
					errNodes.push(node)
				}
			}
		}
		
		if(errNodes.length){
			sendEmail(errNodes);
		}
	}).catch(err =>{
		console.log('=================================err',err);
	} )
	
};
exports.getAllDatas = getAllDatas;
exports.getDatas = getDatas;
