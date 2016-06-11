//----------------------------------------------------------------------------------------------------
// move these all back inside module scope when debugging is done

var cwMetnet;
var metnetTester;
var datasetName;
var currentTumors;

//----------------------------------------------------------------------------------------------------
var metnetModule = (function () {

  var statusDiv;
  var cyDiv;
  var searchBox;
  var hideEdgesButton, showEdgesButton, showAllEdgesButton, clearSelectionButton, sfnButton;
  var metnetFitViewButton, metnetHideEdgesButton, metnetShowEdgesButton, metnetZoomSelectedButton;

  var nodeRestriction = [];
  var helpButton;
  var infoMenu;
  var edgeTypeSelector;
  var mouseOverReadout;
  var graphOperationsMenu;
  var sendSelectionsMenu;
  var layoutMenu;
  var thisModulesName = "metnet";
  var thisModulesOutermostDiv = "metnetDiv";
  var userID = "NA";

     // assigned on first load, used when tumor groups are cleared
  var defaultPatientNodeColor = "black";

      // sometimes a module offers multiple selection destinations.
      // usually there is just one:

  var selectionDestinations = [thisModulesName];


  var sendSelectionsMenuTitle = "Send selection...";

     // the user may specify that only certain tumors, and/or certain genes
     // are to be used in any subsequent network operations -- especially
     // "show edges from selected nodes"
     // to experiment with this capability, there are two new net ops menu
     // options, which assign zero or more selected nodes to these variables,
     // which are then used (if defined) to limit the subsequent network
     // operation


//--------------------------------------------------------------------------------------------
function initializeUI ()
{
  $("#chinookTabs").tabs({
     activate: function(event, ui){
         var tabName = $("#chinookTabs .ui-state-active > a").html()
         console.log("chinookTabs activate event: " + tabName);
         if(tabName == "Network"){
            console.log("setting timeout for metnet.fit");
            setTimeout(function() {handleWindowResize()}, 0)
            }
         }});

  cyDiv = $("#cyMetnetDiv");
  statusDiv = $("#metnetAndPatientsStatusDiv");

  sendSelectionsMenu = hub.configureSendSelectionMenu("#cyMetnetSendSelectionsMenu",
                                                      [thisModulesName], sendSelections,
                                                      sendSelectionsMenuTitle);

  metnetFitViewButton = $("#metnetFitViewButton");
  metnetFitViewButton.click(function(){cwMetnet.fit(50);});

  metnetZoomSelectedButton = $("#metnetZoomSelectedButton");
  metnetZoomSelectedButton.click(zoomSelected);

  metnetHideEdgesButton = $("#metnetHideEdgesButton");
  metnetHideEdgesButton.click(hideAllEdges);
  hub.disableButton(metnetHideEdgesButton);

  metnetShowEdgesFromButton = $("#metnetShowEdgesFromSelectedButton");
  metnetShowEdgesFromButton.click(showEdgesFromSelectedNodes);
  hub.disableButton(metnetShowEdgesFromButton);

  //$("#metnetFitViewButton").click(function(){cwMetnet.fit();});
  //$("#metnetHideEdgesButton").click(hideAllEdges);
  //$("#metnetShowEdgesFromSelectedButton").click(showEdgesFromSelectedNodes);

  graphOperationsMenu = $("#cyMetnetOperationsMenu");
  graphOperationsMenu.change(doGraphOperation);
  graphOperationsMenu.empty();
  graphOperationsMenu.append("<option>Network Operations...</option>");

  var operations = ["Show All Edges",
                    "Show Edges from Selected Nodes",
                    "Hide All Edges",
                    //"Connect to First Neighbors",
                    "Invert Node Selection",
                    "Clear Selections",
                    "Select All Connected Nodes",
                    "Select All Nodes with Selected Edges",
                    "Hide Unselected Nodes",
                    "Show All Nodes",
                    "Restrict Next Ops to Selected Nodes"];

  for(var i=0;i< operations.length; i++){
     var optionMarkup = "<option>" + operations[i] + "</option>";
     graphOperationsMenu.append(optionMarkup);
     } // for


   layoutMenu = $("#markerLayouts");
   layoutMenu.change(performLayout);

   showEdgesButton = $("#cyMetnetShowEdgesButton");
   showEdgesButton.click(showEdges);

   showAllEdgesButton = $("#cyMetnetShowAllEdgesButton");
   showAllEdgesButton.click(showAllEdges);

   sfnButton = $("#cyMetnetSFNButton");
   sfnButton.click(selectFirstNeighbors);
   clearSelectionButton = $("#cyMetnetClearSelectionButton");
   clearSelectionButton.click(clearSelection);

   hideEdgesButton = $("#cyMetnetHideEdgesButton");
   hideEdgesButton.click(hideAllEdges);


   searchBox = $("#metnetSearchBox");

   edgeTypeSelector = $("#metnetEdgeTypeSelector");
   edgeTypeSelector.chosen();

   mouseOverReadout = $("#metnetMouseOverReadout");
   configureCytoscape();
   $(window).resize(handleWindowResize);

   setInterval(buttonAndMenuStatusSetter, 500);

   hub.disableTab(thisModulesOutermostDiv);

} // initializeUI
//----------------------------------------------------------------------------------------------------
// some buttons and menu are live or disabled depending on the presence of e.g., selected nodes
// or visible (non-chromosome) edges.   check those things and set their states appropriately

function buttonAndMenuStatusSetter()
{
   var selectedNodes = cwMetnet.nodes("node:selected");
   var selectedNodeCount = selectedNodes.length;
   $("#metnetSelectionCountReadout").val(selectedNodeCount);

   var selectedPatientNodes = cwMetnet.nodes("node[nodeType='patient']:selected");
   var selectedPatientNodeCount = selectedPatientNodes.length;

   if(selectedNodeCount === 0){
      hub.disableButton(sendSelectionsMenu);
      hub.disableButton(metnetShowEdgesFromButton);
      hub.disableButton(metnetZoomSelectedButton);
      }
   else{
      hub.enableButton(sendSelectionsMenu);
      hub.enableButton(metnetShowEdgesFromButton);
      hub.enableButton(metnetZoomSelectedButton);
      }


   var visibleEdges = cwMetnet.edges().fnFilter(function(e){return(e.visible());})
                                       .fnFilter(function(e){return(e.data("edgeType") != "chromosome");}).length;
   if(visibleEdges > 0)
       hub.enableButton(metnetHideEdgesButton);
   else
       hub.disableButton(metnetHideEdgesButton);

} // buttonAndMenuStatusSetter
//----------------------------------------------------------------------------------------------------
function sendSelections(event)
{
   var destination = sendSelectionsMenu.val();
   console.log("CyMetnet send selections to " + destination);
   sendSelectionsMenu.val(sendSelectionsMenuTitle);
   var nodeNames = selectedNodeNames(cwMetnet);
   if(nodeNames.length === 0){
      console.log("no nodes selected!");
      return;
      }

  var cmd = "sendSelectionTo_" + destination;
  payload = {value: nodeNames, count: nodeNames.length, source: "metnet and patients module"};
  var newMsg = {cmd: cmd,  callback: "", status: "request", payload: payload};

  sendSelectionsMenu.val(sendSelectionsMenuTitle);

  hub.send(JSON.stringify(newMsg));

} // sendSelections
//--------------------------------------------------------------------------------------------
function configureLayoutsMenu(layoutMenu){

   console.log("--- configureLayoutsMenu");
   layoutMenu.append("<option>Layouts...</option>");
   layoutMenu.append("<option> Save Current</option>");

   var defaultLayout = JSON.stringify(cwMetnet.nodes().map(function(n){
          var result = {id:n.id(), position:n.position()};
          return (result);
          }) // map
       ); // stringify

   localStorage.metnetDefault = defaultLayout;

   var existingLayouts = Object.keys(localStorage);
   for(var i=0; i < existingLayouts.length; i++){
      if(existingLayouts[i].match("metnet") !== null){
        layoutMenu.append("<option>" + existingLayouts[i] + "</option>");
        }
      } // for i

} // configureLayoutsMenu
//----------------------------------------------------------------------------------------------------
function performLayout(event){

  var chosenLayoutName = layoutMenu.val();

  if(chosenLayoutName == "Save Current"){
     var uniqueNumber = Math.floor(new Date().getTime()/1000);   // number of seconds since 1970
     newName = "metnet." + (uniqueNumber - 1420414900);    // since today, very roughly
     var positions = cwMetnet.nodes().map(function(n){
           var result = {id:n.id(), position:n.position()};
           return(result);
           }); // map
     currentLayout = JSON.stringify(positions);
     localStorage[newName] = currentLayout;
     layoutMenu.append("<option>" + newName + "</option>");
     layoutMenu.val(newName);
     return;
     } // if "Save Current"

  if(Object.keys(localStorage).indexOf(chosenLayoutName) >= 0){
     var newLayout;
     newLayout = JSON.parse(localStorage[chosenLayoutName]);
     cwMetnet.nodes().positions(function(i, node){
        return{x: newLayout[i].position.x, y:newLayout[i].position.y};
         });
     } // if requested layout name is recognized

  layoutMenu.val("Layouts...");   // restore the title

} // performLayout
//--------------------------------------------------------------------------------------------
function sendSelection()
{
   destinationModule = sendSelectionsMenu.val();
   var nodeNames = selectedNodeNames(cwMetnet);
   if(nodeNames.length === 0){
      console.log("no nodes selected!");
      return;
      }
   metadata = {};
   sendSelectionToModule(destinationModule, nodeNames, metadata);
   sendSelectionsMenu.val("Send Selection...");

} // sendSelectionsMenuChanged
//--------------------------------------------------------------------------------------------
function configureCytoscape ()
{
  cwMetnet = $("#cyMetnetDiv");
  cwMetnet.cytoscape({
     hideEdgesOnViewport: false,
     hideLabelsOnViewport: false,
     boxSelectionEnabled: true,
     showOverlay: false,
     minZoom: 0.001,
     maxZoom: 1000.0,
     layout: {
       name: "preset",
       fit: true
       },
   ready: function() {
      console.log("cwMetnet ready");
      cwMetnet = this;
      cwMetnet.edges().show();

      cwMetnet.on('mousedown', 'node', function(evt){
         var node = evt.cyTarget;
         //mouseOverReadout.val(node.id());
         node.qtip({
            content: this.data("label") + " flux: " + this.data("flux"),
            show: {event: event.type, ready: true},
            hide: {event: 'mouseout'},
            style: {classes: 'qtip-bootstrap', tip: {width: 16,height: 8}}
            }, event);
         });
      cwMetnet.on('mouseout', 'node', function(evt){
         var node = evt.cyTarget;
         mouseOverReadout.val("");
         });

      searchBox.keydown(doSearch);

      console.log("cwMetnet.reset");
      cwMetnet.reset();
      handleWindowResize();
      cwMetnet.edges().selectify(); // this seems to hold through session, visibility notwithstanding
      configureLayoutsMenu(layoutMenu);
      cwMetnet.fit(50);
      } // cwMetnet.ready

     }); // .cytoscape


} // configureCytoscape
//----------------------------------------------------------------------------------------------------
function handleWindowResize ()
{
   cyDiv.width(0.95 * $(window).width());
   cyDiv.height(0.8 * $(window).height());
   cwMetnet.resize();
   cwMetnet.fit(50);

} // handleWindowResize
//----------------------------------------------------------------------------------------------------
// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate)
{
   var timeout;
   return function() {
      var context = this, args = arguments;
      var later = function() {
         timeout = null;
         if (!immediate) func.apply(context, args);
          };
       var callNow = immediate && !timeout;
       clearTimeout(timeout);
       timeout = setTimeout(later, wait);
       if (callNow) func.apply(context, args);
       };
}
//----------------------------------------------------------------------------------------------------
function defaultStyle()
{
   cwMetnet.edges().style({"width": "1px"});

} // defaultStyle
//----------------------------------------------------------------------------------------------------
function doGraphOperation()
{
   var operation = graphOperationsMenu.val();

   switch(operation){
      case "Show All Edges":
         showAllEdges();
         break;
      case "Show Edges from Selected Nodes":
         //showEdgesFromSelectedNodes();
         showEdgesFromSelectedNodes();
         break;
      case "Hide All Edges":
         hideAllEdges();
         break;
      case "Invert Node Selection":
         invertSelection();
         break;
      case "Clear Selections":
         cwMetnet.filter("node:selected").unselect();
         break;
      case "Select All Connected Nodes":
         selectAllConnectedNodes();
         break;
      case "Select All Nodes with Selected Edges":
        selectAllNodesConnectedBySelectedEdges();
        break;
      case "Hide Unselected Nodes":
         cwMetnet.filter("node:unselected").hide();
         break;
      case "Show All Nodes":
         cwMetnet.filter("node:hidden").show();
         break;
      case "Restrict Next Ops to Selected Nodes":
         restrictNextOpsToSelectedNodes();
         break;
      default:
         console.log("unrecoginized graph operation requested from menu: " + operation);
      } // switch

      // restore menu to initial condition, with only title showing
   graphOperationsMenu.val("Network Operations...");

} // doGraphOperation
//----------------------------------------------------------------------------------------------------
function clearSelection ()
{
   cwMetnet.elements().unselect();
}
//----------------------------------------------------------------------------------------------------
function selectFirstNeighbors ()
{
  selectedNodes = cwMetnet.filter("node:selected");
  showEdgesForNodes(cwMetnet, selectedNodes);
}
//----------------------------------------------------------------------------------------------------
function invertSelection ()
{
   selected = cwMetnet.filter("node:selected");
   unselected = cwMetnet.filter("node:unselected");
   selected.unselect();
   unselected.select();
}
//----------------------------------------------------------------------------------------------------
function hideAllEdges ()
{
     // hide all edges besides chromsome edges
  cwMetnet.edges().fnFilter(function(edge) {
     return(edge.data("edgeType") != "chromosome");
     }).hide();

} // hideAllEdges
//----------------------------------------------------------------------------------------------------
// ~/github/metnetViz/webapplets/metabolicNetworks/
function showAllEdges ()
{
   var edgeTypesToDisplay = edgeTypeSelector.val();
   cwMetnet.edges().show()

   //console.log("edgeTypeToDisplay: " + edgeTypesToDisplay);
   //console.log("            count: " + edgeTypesToDisplay.length);

   //if(edgeTypesToDisplay === null){
   //   return;
   //   }

   //for(var e=0; e < edgeTypesToDisplay.length; e++){
   //   var type =  edgeTypesToDisplay[e];
   //   selectionString = "[edgeType=\"" + type + "\"]";
   //   cwMetnet.edges(selectionString).show();
   //   } // for e

} // showAllEdges
//----------------------------------------------------------------------------------------------------
function zoomSelected()
{
   cwMetnet.fit(cwMetnet.$(":selected"), 100);
}
//----------------------------------------------------------------------------------------------------
function handleIncomingIdentifiers(msg)
{
   console.log("Module.metnet, handleIncomingIdentifiers");
      // expect 3 payload fields: value, count, source
   var ids = msg.payload.value;
   if(typeof(ids) == "string")
      ids = [ids];
   //intersectingIDs = hub.intersectionOfArrays(ids, nodeNames())
   intersectingIDs = hub.intersectionOfArrays(ids, nodeIDs());
   console.log("found ids: " + intersectingIDs.length);

   if(intersectingIDs.length > 0){
      selectNodesByID(intersectingIDs);
      }
   else{
      errorMessage = "No overlap with genes or tissue sample IDs:  <br><br>" +
                      ids.join(", ");
      title = ids.length + " unrecognized identifiers";
      console.log("+++++++++++ creating error div");
      // $('<div id="metnetIncomingIdentifiersErrorDialog" />').html(errorMessage).dialog({title: title, width:600, height:300});
      }

   console.log("about to post status from incoming identifiers");
   postStatus("incoming identifiers: " + ids.length);

   hub.raiseTab(thisModulesOutermostDiv);

} // handleIncomingIdentifiers
//----------------------------------------------------------------------------------------------------
  // run all that should happen when this module receives an incoming selection of patientIDs
function demoMetnetIncomingSelectionOfIDs()
{

   names = ["TCGA.06.0210", "TCGA.02.0106", "TCGA.02.0111",
            "TCGA.06.0194", "TCGA.06.0164", "TCGA.06.0409", "TCGA.02.0004",
            "TCGA.02.0051", "TCGA.08.0390", "TCGA.02.0025", "TCGA.08.0392",
            "TCGA.02.0079", "TCGA.12.0620", "TCGA.08.0373", "TCGA.06.0645",
            "TCGA.06.0192", "TCGA.12.0776", "TCGA.12.0778", "TCGA.06.0750",
            "TCGA.06.0878", "TCGA.14.0789", "TCGA.06.0881", "BCL11A",
            "BRCA1", "MDM2", "PIK3R1", "ABCA1", "CDK6", "CNTRL", "FH",
            "IFNA1", "LMO2", "PRKCA", "RELA", "STK11", "ZEB1", "CCNB1IP1",
            "CREB3L1", "GDF2", "OR4K2", "PRKCH", "WAS"];

   subset = [];
   for(var i=0; i < 10; i++)
     subset.push(names[getRandomInt(0, names.length -1)]);

   selectNodes(subset);

} // demoIncomingSelectionOfPatientIDs
//----------------------------------------------------------------------------------------------------
function allNodeIDs()
{
   ids = [];
   allNodes = cwMetnet.nodes();

   for(i=0; i < allNodes.length; i++)
       ids.push(allNodes[i].data("id"));

   return(ids);

} // allNodeIDs
//----------------------------------------------------------------------------------------------------
function showEdges()
{
   hideAllEdges();   // is this wise?

   var edgeTypesToDisplay = edgeTypeSelector.val();
   if(edgeTypesToDisplay === null){
      hideAllEdges();
      return;
      }

   var selectedNodes = selectedNodeIDs(cwMetnet);

   //console.log(" newEdgeTypeSelection (" + edgeTypesToDisplay.length +
   //            "), selectedNodes: " + selectedNodes.length);

   if(selectedNodes.length > 0) { // show edges to and from all selected nodes
     showEdgesForNodes(cwMetnet, selectedNodes);
     }

} // showEdges
//----------------------------------------------------------------------------------------------------
function zoomSelection()
{
   cwMetnet.fit(cwMetnet.$(":selected"), 50);
}
//----------------------------------------------------------------------------------------------------
function selectedNodeIDs(cw)
{
   ids = [];
   noi = cw.filter("node:selected");
   for(var n=0; n < noi.length; n++){
     ids.push(noi[n].data("id"));
     }
  return(ids);

} // selectedNodeIDs
//----------------------------------------------------------------------------------------------------
function selectedNodeNames(cw)
{
   var names = [];
   var noi = cw.filter("node:selected");
   for(var n=0; n < noi.length; n++){
     names.push(noi[n].data("name"));
     }

  return(names);

} // selectedNodeNames
//----------------------------------------------------------------------------------------------------
function showEdgesFromSelectedNodes()
{

   var targets = nodeRestriction;
   var selectedNodes = cwMetnet.nodes("node:selected");
   var neighbors = selectedNodes.neighborhood();
   var candidateEdges = neighbors.filterFn(function(e){
       if(e.isEdge()) return (e);
       });

   candidateEdges = candidateEdges.fnFilter(function(edge){
      return(edgeTypeSelector.val().indexOf(edge.data("edgeType")) >= 0);
      });

   if(targets.length === 0){
      candidateEdges.show();
      postStatus("showEdgesFromSelectedNodes");
      return;
      }

   function intersects(array1, array2){
      var size = array1.filter(function(n) {return (array2.indexOf(n) != -1);}).length;
      return(size > 0);
      }

   candidateEdges.filterFn(function(edge){
      var actual=edge.connectedNodes().map(function(node){return node.id();});
      return(intersects(actual, targets));
       }).show();

   postStatus("showEdgesFromSelectedNodes");

} // showEdgesFromSelectedNodes
//----------------------------------------------------------------------------------------------------
function selectSourceAndTargetNodesOfEdges(cw, edges)
{
  //var eoi = cwMetnet.filter('edge:visible');
  var notChromosomal = function(edge){return(edge.data("edgeType") !== "chromosome");};
  eoi = edges.filterFn(notChromosomal);

  var filterStrings = [];

  for(var i=0; i < eoi.length; i++){
     edge = eoi[i];
     targetID = edge.target().data("id");
     sourceID = edge.source().data("id");
     var sourceFilterString = '[id="' + sourceID + '"]';
     var targetFilterString = '[id="' + targetID + '"]';
     filterStrings.push(sourceFilterString);
     filterStrings.push(targetFilterString);
     } // for i

   var nodesToSelect = cw.nodes(filterStrings.join());
   nodesToSelect.select();

} // selecteSourceAndTargetNodesOfEdge
//----------------------------------------------------------------------------------------------------
// todo: massive inefficiencies here
function showEdgesForNodes(cw, nodes)
{

  var edgeTypes = edgeTypeSelector.val();
  console.log("=== showEdgesForNodes, edgeType count: " + edgeTypes.length);
  //console.log(edgeTypes);

  if(edgeTypes.length === 0)
      return;

  var filterStrings = [];

  setTimeout(function(){
     for(var e=0; e < edgeTypes.length; e++){
        var edgeType = edgeTypes[e];
        for(var n=0; n < nodes.length; n++){
          var nodeID = nodes[n].data("id");
          var sourceFilterString = '[edgeType="' + edgeType + '"][source="' + nodeID + '"]';
          var targetFilterString = '[edgeType="' + edgeType + '"][target="' + nodeID + '"]';
          filterStrings.push(sourceFilterString);
          filterStrings.push(targetFilterString);
          } // for n
        } // for e

      //console.log("filterString count: " + filterStrings.length);
      filter = filterStrings.join();
      //console.log("filter created, about to apply...");
      var existingEdges = cw.edges(filter);
      //console.log("filtering complete");
      if(existingEdges.length > 0) {
         //console.log("about to show edges");
         existingEdges.show();
         //console.log("edges shown...");
         }
     }, 0); // setTimeout

} // showEdgesForNodes
//----------------------------------------------------------------------------------------------------
function selectAllConnectedNodes()
{
    var selectedEdges = cwMetnet.filter("edge:visible");
    selectedEdges = selectedEdges.filterFn(function(e){return (e.data("edgeType") !== "chromosome");});
    if(selectedEdges.length > 0)
       selectSourceAndTargetNodesOfEdges(cwMetnet, selectedEdges);

} // selectAllConnectedNodes
//----------------------------------------------------------------------------------------------------
function selectAllNodesConnectedBySelectedEdges()
{
    edges = cwMetnet.filter("edge:selected");
    console.log(" selected edge count: " + edges.length);
    if(edges.length === 0)
      return;
    for(var e=0; e < edges.length; e++){
       selectNodes(edges[e].target().data("name"));
       selectNodes(edges[e].source().data("name"));
       } // for e

} //selectAllNodesConnectedBySelectedEdges
//----------------------------------------------------------------------------------------------------
function showEdgesForSelectedNodes(cw, edgeTypes)
{
   var nodeIDs = selectedNodeIDs(cw);
   for(var n=0; n < nodeIDs.length; n++){
      nodeID = nodeIDs[n];
      for(var e=0; e < edgeTypes.length; e++){
         edgeType = edgeTypes[e];
         filterString = '[edgeType="' + edgeType + '"][source="' + nodeID + '"]';
         //console.log("filter string: " + filterString);
         cw.edges(filterString).show();
         filterString = '[edgeType="' + edgeType + '"][target="' + nodeID + '"]';
         //console.log("filter string: " + filterString);
         cw.edges(filterString).show();
         } // for e
      } // for n

} // showEdgesForSelectedNodes
//----------------------------------------------------------------------------------------------------
function restrictNextOpsToSelectedNodes()
{
  var nodes = cwMetnet.nodes("node:selected"); // .filter("[nodeType='gene']");
  if(nodes.length === 0){
     nodeRestriction = [];
     }
  else{
     nodeRestriction = nodes.map(function(node){return (node.id());});
     }

} // restrictNextOpsToSelectedNodes
//----------------------------------------------------------------------------------------------------
function nodeNames()
{
  var nodes = cwMetnet.filter("node:visible");
  var result = [];
  for(var i=0; i < nodes.length; i++){
    result.push(nodes[i].data().label);
    } // for i

  return(result);

} // nodeNames
//----------------------------------------------------------------------------------------------------
function nodeIDs()
{
   return(cwMetnet.nodes().map(function(node){return (node.id());}));
}
//----------------------------------------------------------------------------------------------------
function upperCaseNodeIDs()
{
   return(nodeIDs().map(function(node){return(node.toUpperCase());}));
}
//----------------------------------------------------------------------------------------------------
// todo: build up the filter string first, then send it all at once
function selectNodes(nodeNames)
{
  console.log("Module.metnet::selectNodes");
  //console.log(nodeNames);

  if(typeof(nodeNames) == "string")   // trap scalar, but expect and support arrays
     nodeNames = [nodeNames];

  var allNodes = cwMetnet.nodes().map(function(n){return (n.id());});
  var allNodesUpperCase = allNodes.map(function(name){return (name.toUpperCase());});

  for(var i=0; i < nodeNames.length; i++){
    var nodeName = nodeNames[i].toUpperCase();  // depends upon this conv
    var index = allNodesUpperCase.indexOf(nodeName);
    if(index >= 0){
      var actualNodeID = allNodes[index];
      var s = "cwMetnet.filter('node[id=\"" + actualNodeID + "\"]').select()";
       //console.log("metnet selectNodes: " + s);
       JAVASCRIPT_EVAL (s);
       } // if found, index >= 0
    } // for i

   postStatus("nodes selected: " + allNodes.length);

} // selectNodes
//----------------------------------------------------------------------------------------------------
   // todo: build up the filter string first, then send it all at once
function selectNodesByID(nodeIDs) {

  if(typeof(nodeIDs) == "string")   // trap scalar, but expect and support arrays
     nodeIDs = [nodeIDs];

  console.log("about to select nodes by id: " + nodeIDs.length);
  console.log(nodeIDs);

  for(var i=0; i < nodeIDs.length; i++){
    s = "cwMetnet.filter('node[id=\"" + nodeIDs[i] + "\"]').select()";
    console.log(s);
    JAVASCRIPT_EVAL (s);
    } // for i

} // selectNodesByID
//----------------------------------------------------------------------------------------------------
function doSearch(e)
{
   var keyCode = e.keyCode || e.which;

   if (keyCode == 13) {
      var searchString = searchBox.val().toUpperCase();
      if(searchString.length === 0)
         return;
      console.log("searchString: " + searchString);
      var idsActual = nodeIDs();
      var idsUpper = upperCaseNodeIDs();
      var hits = idsUpper.filter(function(id) {return(id.indexOf(searchString) === 0);});
      var hitIndices = hits.map(function(hit) {return(idsUpper.indexOf(hit));});
      var hitsActual = hitIndices.map(function(hit) {return(idsActual[hit]);});
      selectNodes(hitsActual);
      } // if 13 (return key)

} // doSearch
//----------------------------------------------------------------------------------------------------
function displayMetnetNetwork(msg)
{
   console.log("--- Module.metnet: displayMetnetNetwork");
   hub.enableTab(thisModulesOutermostDiv);
   hub.raiseTab(thisModulesOutermostDiv);
   hub.logEventOnServer(thisModulesName, "display metnet network", "data received", "");

   if(msg.status == "success"){
       graphAsString = msg.payload["g.json"];
       console.log("nchar(network): " + graphAsString.length);
       var json = JSON.parse(graphAsString);
       cwMetnet.remove(cwMetnet.edges());
       cwMetnet.remove(cwMetnet.nodes());
       console.log(" after JSON.parse, node/edge count: " + json.elements.nodes.length + "/" + json.elements.edges.length)
       console.log("  about to add json.elements");
       cwMetnet.add(json.elements);
       console.log(50);
       cwMetnet.style(json.style);
       cwMetnet.nodes().unselect();
       console.log(51);
           // map current node degree into a node attribute of that name
       //cwMetnet.nodes().map(function(node){node.data({degree: node.degree(), trueWidth: node.width(), trueHeight: node.height()});});
       console.log(52);

       var edgeTypes = hub.uniqueElementsOfArray(cwMetnet.edges().map(function(edge){
                                  return(edge.data("edgeType"));}
                                  ));
       console.log(53);
         updateEdgeSelectionWidget(edgeTypes);  // preserve only known edgeTypes
       console.log(54);

       cwMetnet.fit(20);
       console.log(55);
       var defaultLayout = JSON.stringify(cwMetnet.nodes().map(function(n){
                                         return({id:n.id(), position:n.position()});}));
      localStorage.metnetDefault = defaultLayout;
      defaultPatientNodeColor = cwMetnet.nodes("[nodeType='patient']").style("background-color");

      hub.logEventOnServer(thisModulesName, "display metnet network", "complete", "");
      }
   else{
     console.log("displayMetnetNetwork error: " + msg.payload);
     }

} // displayMetnetNetwork
//----------------------------------------------------------------------------------------------------
function postStatus(msg)
{
  statusDiv.text(msg);

} // postStatus
//----------------------------------------------------------------------------------------------------
// ensure that only edgeTypes in current network are offered in the selection widget
function updateEdgeSelectionWidget(edgeTypes)
{
     // loop over currently offered edge types
     //             <option value="mutation" class="btn-info" selected>Mut</option>

   var edgeTypeMenu = $("#metnetEdgeTypeSelector");
   edgeTypeMenu.find('option').remove();
   edgeTypeMenu.trigger("chosen:updated");

   edgeTypes = edgeTypes.filter(function(e){return(e !== "chromosome");});

   for(var i=0; i < edgeTypes.length; i++){
      var name = edgeTypes[i];
      var optionMarkup =  "<option value='" + name + "' class='btn-info' selected>" + name + "</option>";
      $("#metnetEdgeTypeSelector").append(optionMarkup);
      }

   $("#metnetEdgeTypeSelector").trigger("chosen:updated");

} // updateEdgeSelectionWidget
//----------------------------------------------------------------------------------------------------
// called when the a dataset has been specified, typically via the Datasets tab, which presents
// the user with a list of the datasets they are able to use, from which they choose one at a time
// as their current working dataset.
// this module uses the dataset name to request the g.metnet.json network from the server
function datasetSpecified (msg)
{
   datasetName = msg.payload;

   console.log("=== Module.metnet, datasetSpecified");
   console.log(datasetName)

   hub.logEventOnServer(thisModulesName, "display metnet network", "request", "");

   payload = {datasetName: datasetName, items: ["g.json"]}
   var newMsg = {cmd: "getDatasetItemsByName",  callback: "displayMetnetNetwork",
                 status: "request", payload: payload};
   hub.send(JSON.stringify(newMsg));

} // datasetSpecified
//----------------------------------------------------------------------------------------------------

 return{
     init: function(){
       hub.addMessageHandler("sendSelectionTo_MetnetAndPatients", handleIncomingIdentifiers);
       hub.registerSelectionDestination(selectionDestinations, thisModulesOutermostDiv);
       hub.addMessageHandler("datasetSpecified", datasetSpecified);
       hub.addMessageHandler("displayMetnetNetwork", displayMetnetNetwork);
       hub.addOnDocumentReadyFunction(initializeUI);
       }
     };

   }); // metnetModule
//----------------------------------------------------------------------------------------------------
metnetModule = metnetModule();
metnetModule.init();

