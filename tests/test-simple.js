/**
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var fs = require('fs');
var path = require('path');

var sprintf = require('./../lib/sprintf').sprintf;
var et = require('elementtree');
var XML = et.XML;
var ElementTree = et.ElementTree;
var Element = et.Element;
var SubElement = et.SubElement;
var SyntaxError = require('errors').SyntaxError;

function readFile(name) {
  return fs.readFileSync(path.join(__dirname, '/data/', name), 'utf8');
}

exports['test_simplest'] = function(test, assert) {
  /* Ported from <https://github.com/lxml/lxml/blob/master/src/lxml/tests/test_elementtree.py> */
  var Element = et.Element;
  var root = Element('root');
  root.append(Element('one'));
  root.append(Element('two'));
  root.append(Element('three'));
  assert.equal(3, root.len());
  assert.equal('one', root.getItem(0).tag);
  assert.equal('two', root.getItem(1).tag);
  assert.equal('three', root.getItem(2).tag);
  test.finish();
};


exports['test_attribute_values'] = function(test, assert) {
  var XML = et.XML;
  var root = XML('<doc alpha="Alpha" beta="Beta" gamma="Gamma"/>');
  assert.equal('Alpha', root.attrib['alpha']);
  assert.equal('Beta', root.attrib['beta']);
  assert.equal('Gamma', root.attrib['gamma']);
  test.finish();
};


exports['test_findall'] = function(test, assert) {
  var XML = et.XML;
  var root = XML('<a><b><c/></b><b/><c><b/></c></a>');

  assert.equal(root.findall("c").length, 1);
  assert.equal(root.findall(".//c").length, 2);
  assert.equal(root.findall(".//b").length, 3);
  assert.equal(root.findall(".//b")[0]._children.length, 1);
  assert.equal(root.findall(".//b")[1]._children.length, 0);
  assert.equal(root.findall(".//b")[2]._children.length, 0);
  assert.deepEqual(root.findall('.//b')[0], root.getchildren()[0]);

  test.finish();
};

exports['test_elementtree_find_qname'] = function(test, assert) {
  var tree = new et.ElementTree(XML('<a><b><c/></b><b/><c><b/></c></a>'));
  assert.deepEqual(tree.find(new et.QName('c')), tree.getroot()._children[2]);
  test.finish();
};

exports['test_attrib_ns_clear'] = function(test, assert) {
  var attribNS = '{http://foo/bar}x';

  var par = Element('par');
  par.set(attribNS, 'a');
  var child = SubElement(par, 'child');
  child.set(attribNS, 'b');

  assert.equal('a', par.get(attribNS));
  assert.equal('b', child.get(attribNS));

  par.clear();
  assert.equal(null, par.get(attribNS));
  assert.equal('b', child.get(attribNS));
  test.finish();
};

exports['test_create_tree_and_parse_simple'] = function(test, assert) {
  var i = 0;
  var e = new Element('bar', {});
  var expected = "<?xml version='1.0' encoding='utf-8'?>\n" +
    '<bar><blah a="11" /><blah a="12" /><gag a="13" b="abc">ponies</gag></bar>';

  SubElement(e, "blah", {a: '11'});
  SubElement(e, "blah", {a: '12'});
  var se = et.SubElement(e, "gag", {a: '13', b: 'abc'});
  se.text = 'ponies';

  se.itertext(function(text) {
    assert.equal(text, 'ponies');
    i++;
  });

  assert.equal(i, 1);
  var etree = new ElementTree(e);
  var xml = etree.write();
  assert.equal(xml, expected);
  test.finish();
};

exports['test_parse_and_find_2'] = function(test, assert) {
  var data = readFile('xml1.xml');
  var etree = et.parse(data);

  assert.equal(etree.findall('./object').length, 2);
  assert.equal(etree.findall('[@name]').length, 1);
  assert.equal(etree.findall('[@name="test_container_1"]').length, 1);
  assert.equal(etree.findall('[@name=\'test_container_1\']').length, 1);
  assert.equal(etree.findall('./object')[0].findtext('name'), 'test_object_1');
  assert.equal(etree.findtext('./object/name'), 'test_object_1');
  assert.equal(etree.findall('.//bytes').length, 2);
  assert.equal(etree.findall('*/bytes').length, 2);
  assert.equal(etree.findall('*/foobar').length, 0);

  test.finish();
};

exports['test_syntax_errors'] = function(test, assert) {
  var expressions = [ './/@bar', '[@bar', '[@foo=bar]', '[@', '/bar' ];
  var errCount = 0;
  var data = readFile('xml1.xml');
  var etree = et.parse(data);

  expressions.forEach(function(expression) {
    try {
      etree.findall(expression);
    }
    catch (err) {
      errCount++;
    }
  });

  assert.equal(errCount, expressions.length);
  test.finish();
};

exports['test_register_namespace'] = function(test, assert){
  var prefix = 'TESTPREFIX';
  var namespace = 'http://seriously.unknown/namespace/URI';
  var errCount = 0;

  var etree = Element(sprintf('{%s}test', namespace));
  assert.equal(et.tostring(etree, { 'xml_declaration': false}),
               sprintf('<ns0:test xmlns:ns0="%s" />', namespace));

  et.register_namespace(prefix, namespace);
  var etree = Element(sprintf('{%s}test', namespace));
  assert.equal(et.tostring(etree, { 'xml_declaration': false}),
               sprintf('<%s:test xmlns:%s="%s" />', prefix, prefix, namespace));

  try {
    et.register_namespace('ns25', namespace);
  }
  catch (err) {
    errCount++;
  }

  assert.equal(errCount, 1, 'Reserved prefix used, but exception was not thrown');
  test.finish();
};

exports['test_tostring'] = function(test, assert) {
  var a = Element('a');
  var b = SubElement(a, 'b');
  var c = SubElement(a, 'c');
  c.text = 'ponies';

  assert.equal(et.tostring(a, { 'xml_declaration': false }), '<a><b /><c>ponies</c></a>');
  test.finish();
};
