'use strict';

const fs = require('fs');
/**
 * ["101.71.28.131:8183","101.71.28.132:8183",]
  * @returns {Array}
 */
const groupsNodes = () => {
	let groups = JSON.parse(fs.readFileSync('groups.json', {encoding: 'utf-8'}));
	let nodes = [], nodesGroups = [];
	for (let group in groups) {
		nodes = nodes.concat(groups[group].nodes)
	}
	return nodes;
}
/**
 * [{node: '',name: 'rtb}]
 * @returns {Array}
 */
const nodesGroups = () => {
	let groups = JSON.parse(fs.readFileSync('groups.json', {encoding: 'utf-8'}));
	let nodes = [];
	for (let group in groups) {
		for (let index in groups[group].nodes) {
			nodes.push({node: groups[group].nodes[index], name: group});
		}
	}
	return nodes;
}
exports.nodesGroups = nodesGroups;

exports.groupsNodes = groupsNodes;
