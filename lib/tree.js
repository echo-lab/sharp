'use babel';
import * as d3 from "d3";
import {Point, Range} from 'atom';

const IDPREPEND = 'sharp';

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/tree
export function Tree(data, { // data is either tabular (array of objects) or hierarchy (nested objects)
  path, // as an alternative to id and parentId, returns an array identifier, imputing internal nodes
  id = Array.isArray(data) ? d => d.id : null, // if tabular data, given a d in data, returns a unique identifier (string)
  parentId = Array.isArray(data) ? d => d.parentId : null, // if tabular data, given a node d, returns its parent’s identifier
  children, // if hierarchical data, given a d in data, returns its children
  tree = d3.tree, // layout algorithm (typically d3.tree or d3.cluster)
  sort, // how to sort nodes prior to layout (e.g., (a, b) => d3.descending(a.height, b.height))
  label, // given a node d, returns the display name
  title, // given a node d, returns its hover text
  link, // given a node d, its link (if any)
  linkTarget = "_blank", // the target attribute for links (if any)
  width = 640, // outer width, in pixels
  height, // outer height, in pixels
  r = 3, // radius of nodes
  padding = 1, // horizontal padding for first and last column (in "node"-spacing ...)
  patternNum = Array.isArray(data) ? d => d.patternNum : -1,
  fill = "#999", // fill for nodes
  selectedFill = "red", // fill for selected nodes
  isSelected = Array.isArray(data) ? d => d.isSelected : false,
  fillOpacity, // fill opacity for nodes
  originalLineText, //text in original line before replacement
  stroke = "#555", // stroke for links
  strokeWidth = 1.5, // stroke width for links
  strokeOpacity = 0.4, // stroke opacity for links
  strokeLinejoin, // stroke line join for links
  strokeLinecap, // stroke line cap for links
  halo = "#fff", // color of label halo
  haloWidth = 3, // padding around the labels
  scaleXPos = false,  // Scale the x-position of the node by the node's index (... as an example of how we could do time)
} = {}) {

  // If id and parentId options are specified, or the path option, use d3.stratify
  // to convert tabular data to a hierarchy; otherwise we assume that the data is
  // specified as an object {children} with nested objects (a.k.a. the “flare.json”
  // format), and use d3.hierarchy.
  const root = path != null ? d3.stratify().path(path)(data)
      : id != null || parentId != null ? d3.stratify().id(id).parentId(parentId)(data)
      : d3.hierarchy(data, children);

  console.log("DA ROOT: ", root);

  // Sort the nodes.
  if (sort != null) root.sort(sort);

  // Compute labels and titles.
  const descendants = root.descendants();
  const L = label == null ? null : descendants.map(d => label(d.data, d));

  // Compute the layout.
  const dx = 20;  // change this to change the height between branch nodes
  const dy = scaleXPos ? width / (data.length + padding) : width / (root.height + padding);
  tree().nodeSize([dx, dy])(root);  // adds .x and .y positions to all the node objects

  // Center the tree.
  let x0 = Infinity;
  let x1 = -x0;
  root.each(d => {
    if (d.x > x1) x1 = d.x;
    if (d.x < x0) x0 = d.x;
  });

  // Compute the default height.
  if (height === undefined) height = x1 - x0 + dx * 2;

  const svg = d3.create("svg")
      .attr("viewBox", [-dy * padding / 2, x0 - dx, width, height])
      .attr("width", width)
      .attr("height", height)
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10);

  svg.append("g")
      .attr("fill", "none")
      .attr("stroke", stroke)
      .attr("stroke-opacity", strokeOpacity)
      .attr("stroke-linecap", strokeLinecap)
      .attr("stroke-linejoin", strokeLinejoin)
      .attr("stroke-width", strokeWidth)
    .selectAll("path")
      .data(root.links())
      .join("path")
        .attr("d", d3.linkHorizontal()
            .x(d => scaleXPos ? (d.data.idx + 1)*dy : d.y)
            .y(d => d.x));

  const node = svg.append("g")
    .selectAll("a")
    .data(root.descendants())
    .join("a")
      .attr("xlink:href", link == null ? null : d => link(d.data, d))
      .attr("target", link == null ? null : linkTarget)
      .attr("transform", d => `translate(${scaleXPos ? dy * (d.data.idx+1) : d.y},${d.x})`);

  node.append("circle")
      .attr("fill", fill)
      //.attr("fill", d => d.name === this.pattern_history.getSelectedNodeIndex() ? fill : selectedFill)
      // .attr("fill", function (d) {
      //   console.log("Node " + d.data.name + " is selected? " + d.data.isSelected);
      //   return d.data.isSelected ? selectedFill : fill;
      // }.bind(svg.node()))
      .style("stroke", function (d) {
        console.log("Node " + d.data.name + " is selected? " + d.data.isSelected);
        return d.data.isSelected ? "yellow" : "none";
      })
      .style("stroke-width", 2)
      //.style("stroke", "red")      // set the line colour

      .attr("id", function (d) { return IDPREPEND + d.data.patternNum + d.data.name; })
      // .attr("fill", function (d) {
      //   console.log("Dis Histroy: " + this.pattern_history);
      //   return d.children;
      // }.bind(svg.node()))

      .attr("r", r)

      .on("click", function (evt, d) {
        console.log("clicked a node: ", d.data.name, "\nOther info: ", evt, d);
        let nodeClicked = this.pattern_history.getPatternHistory()[d.data.name];
        this.pattern_history.setSelectedNode(nodeClicked);
        let colorNodeIndex = this.pattern_history.getSelectedNodeIndex();

        //clear the selected node color
        let patternLen = this.pattern_history.getPatternHistory().length;
        for(let i = 0; i < patternLen; i++){
          let idstr = '#' + IDPREPEND + d.data.patternNum + i;
          d3.select(idstr).style("stroke","none");
          //d3.select(idstr).style("stroke-width", 0)
        }
        //d3.select("circle").style("fill","gray");
        //select the node in the graph
        let idstr = '#' + IDPREPEND + d.data.patternNum + colorNodeIndex;
        console.log("Clicked on id: #" + idstr);
        d3.select(idstr).style("stroke","yellow");

        d.originalLineText = nodeClicked.getLine();

        // var editor;
        // editor = atom.workspace.getActiveTextEditor();
        //
        // //update lineNum for box, if needed
        // this.pattern_container["lineNum"] = this.pattern_container["marker"].getStartBufferPosition().row;
        //
        // let nodeStr = nodeClicked.getLine();
        // console.log(nodeStr);
        //
        // //find the range of the box thingy
        // let lineNum = this.pattern_container["lineNum"];
        // console.log(lineNum);
        // let range = new Range(new Point(lineNum - 1, 0), new Point(lineNum - 1, 100000));
        // console.log(range);
        //
        // //move range up to account for blank lines
        // while(editor.getTextInBufferRange(range).trim() === ""){
        //   range.start.row -= 1
        //   range.end.row -= 1
        // }
        //
        // //move cursor
        // let cursor = editor.getLastCursor();
        // cursor.moveToTop();
        // cursor.moveDown(range.start.row);
        //
        // let prev_text_range = editor.getCurrentParagraphBufferRange();
        //
        // //get the text that relates to the box and replace it
        // editor.setTextInBufferRange(prev_text_range, nodeStr);

      }.bind(svg.node()))

      .on("mouseover", function (_, d) {
        console.log("Hovered over: ", d.data.name);
        let nodeHovered = this.pattern_history.getPatternHistory()[d.data.name];

        // this.pattern_container["hoverbox"].innerHTML = `
        // <p>${nodeHovered.getLine()}</p>
        // `;

        var editor;
        editor = atom.workspace.getActiveTextEditor();
        d.originalLineText = this.pattern_history.getSelectedNode().getLine();

        //update lineNum for box, if needed
        this.pattern_container["lineNum"] = this.pattern_container["marker"].getStartBufferPosition().row;

        let nodeStr = nodeHovered.getLine();
        console.log(nodeStr);

        //find the range of the box thingy
        let lineNum = this.pattern_container["lineNum"];
        console.log(lineNum);
        let range = new Range(new Point(lineNum - 1, 0), new Point(lineNum - 1, 100000));
        console.log(range);

        //move range up to account for blank lines
        while(editor.getTextInBufferRange(range).trim() === ""){
          range.start.row -= 1
          range.end.row -= 1
        }

        //move cursor
        let cursor = editor.getLastCursor();
        cursor.moveToTop();
        cursor.moveDown(range.start.row);

        let prev_text_range = editor.getCurrentParagraphBufferRange();

        //get the text that relates to the box and replace it
        editor.setTextInBufferRange(prev_text_range, nodeStr);

      }.bind(svg.node()))

      .on("mouseout", function (_, d) {
        console.log("Un-Hovered over: ", d.data.name);
        let nodeHovered = this.pattern_history.getPatternHistory()[d.data.name];

        // this.pattern_container["hoverbox"].innerHTML = ``;

        var editor;
        editor = atom.workspace.getActiveTextEditor();

        //update lineNum for box, if needed
        this.pattern_container["lineNum"] = this.pattern_container["marker"].getStartBufferPosition().row;

        //find the range of the box thingy
        let lineNum = this.pattern_container["lineNum"];
        console.log(lineNum);
        let range = new Range(new Point(lineNum - 1, 0), new Point(lineNum - 1, 100000));
        console.log(range);

        //move range up to account for blank lines
        while(editor.getTextInBufferRange(range).trim() === ""){
          range.start.row -= 1
          range.end.row -= 1
        }

        //move cursor
        let cursor = editor.getLastCursor();
        cursor.moveToTop();
        cursor.moveDown(range.start.row);

        let prev_text_range = editor.getCurrentParagraphBufferRange();

        //get the text that relates to the box and replace it
        editor.setTextInBufferRange(prev_text_range, d.originalLineText);

      }.bind(svg.node()))

      .on("contextmenu", function (_, d) {  // Right-click
        console.log("Right-clicked on: ", d.data.name);
        let nodeHovered = this.pattern_history.getPatternHistory()[d.data.name];

      }.bind(svg.node()))

  if (title != null) node.append("title")
      .text(d => title(d.data, d));

  if (L) node.append("text")
      .attr("dy", "0.32em")
      .attr("x", d => d.children ? -6 : 6)
      .attr("text-anchor", d => d.children ? "end" : "start")
      .attr("paint-order", "stroke")
      .attr("stroke", halo)
      .attr("stroke-width", haloWidth)
      .text((d, i) => L[i]);

  return svg.node();
}