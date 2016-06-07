import com.yworks.yfiles.graph.LayoutUtilities;

import com.yworks.yfiles.layout.hierarchic.HierarchicLayout;
import com.yworks.yfiles.layout.organic.OrganicLayout;
import com.yworks.yfiles.layout.orthogonal.OrthogonalLayout;
import com.yworks.yfiles.layout.orthogonal.OrthogonalLayout;
import com.yworks.yfiles.layout.radial.RadialLayout;

import com.yworks.yfiles.layout.tree.BalloonLayout;
import com.yworks.yfiles.layout.tree.TreeLayout;
import com.yworks.yfiles.layout.tree.ClassicTreeLayout;


import com.yworks.yfiles.graph.*;
import com.yworks.yfiles.geometry.*;

import java.io.BufferedReader;
import java.io.*;
import java.util.ArrayList;
import java.util.List;
import java.util.HashMap;
import java.util.StringTokenizer;

import com.opencsv.CSVReader;
//------------------------------------------------------------------------------------------------------------------------
public class PerformLayout {

//public static List<String[]> readTable(String filename) throws Exception
public static HashMap<String,Integer> readTable(String filename) throws Exception
{
  CSVReader reader2 = new CSVReader(new FileReader(filename), '\t');
  List<String[]> result = reader2.readAll();
  HashMap<String, Integer> nodeSizeMap = new HashMap<String,Integer>();
  for(int i=0; i < result.size(); i++){
     String[] row = result.get(i);
     //System.out.println("node: " + row[0] + "  x: " + Integer.parseInt(row[1]) +  "  y: " + Integer.parseInt(row[2]));
     String nodeName = row[0];
     Integer nodeSize = Integer.parseInt(row[1]);
     nodeSizeMap.put(nodeName, nodeSize);
     } // for i

  return (nodeSizeMap);

} // readTable
//------------------------------------------------------------------------------------------------------------------------
public static void main(String[] args) throws Exception
{
  System.out.println("arg count: " + args.length);
  String line;
  InputStream fis = new FileInputStream("interactions.tsv");
  InputStreamReader isr = new InputStreamReader(fis);
  BufferedReader br = new BufferedReader(isr);

  IGraph graph = new DefaultGraph();
  RectD nodeBounds = new RectD(0, 0, 50, 50);
  List<String> nodeNames = new ArrayList<String>();
  HashMap<String,INode> nodeMap = new HashMap<String,INode>();

  //List<String[]> nodeSizes = readTable("nodeSize.tsv");
  HashMap<String,Integer>  nodeSizes = readTable("nodeSize.tsv");
  System.out.println("have size data on " + nodeSizes.size() + " nodes.");

  int lineCount = 0;
  while ((line = br.readLine()) != null) {
     lineCount = lineCount + 1;
     if(lineCount == 1) continue;
     String[] tokens = line.split("\t");
     String nameA = tokens[0];
     String nameB = tokens[1];
     Integer nodeSize = 10;
     if(nodeSizes.containsKey(nameA)){
        System.out.println("found size info for A: " + nodeSizes.get(nameA));
        nodeSize = nodeSizes.get(nameA);
        }
     if(!nodeNames.contains(nameA)){
        nodeNames.add(nameA);
        INode newNodeA = graph.createNode(nodeBounds);
        nodeMap.put(nameA, newNodeA);
        }
     if(nodeSizes.containsKey(nameB)){
        System.out.println("found size info for B: " + nodeSizes.get(nameB));
        nodeSize = nodeSizes.get(nameB);
        }
     if(!nodeNames.contains(nameB)){
        nodeNames.add(nameB);
        INode newNodeB = graph.createNode(new RectD(0,0, nodeSize, nodeSize));
        nodeMap.put(nameB, newNodeB);
        }
     INode nodeA = (INode) nodeMap.get(nameA);
     INode nodeB = (INode) nodeMap.get(nameB);
     graph.addLabel(nodeA, nameA);
     graph.addLabel(nodeB, nameB);
     IEdge e = graph.createEdge(nodeA, nodeB);
     }

  HierarchicLayout hierarchicLayouter = new HierarchicLayout();
  OrganicLayout organicLayouter = new OrganicLayout();
  OrthogonalLayout orthogonalLayouter = new OrthogonalLayout();
  TreeLayout treeLayouter = new TreeLayout();
  RadialLayout radialLayouter = new RadialLayout();

  organicLayouter.setMinimumNodeDistance(50);
  radialLayouter.setLayerSpacing(4);

  //LayoutUtilities.applyLayout(graph, hierarchicLayouter);
  LayoutUtilities.applyLayout(graph, organicLayouter);
  //LayoutUtilities.applyLayout(graph, orthogonalLayouter);
  //LayoutUtilities.applyLayout(graph, treeLayouter);
  //LayoutUtilities.applyLayout(graph, radialLayouter);

  System.out.println("id\tx\ty");
  for(INode node: graph.getNodes()) {
    double x = node.getLayout().getCenter().getX();
    double y = node.getLayout().getCenter().getY();
    System.out.println(node + "\t" + x + "\t" + y);
    }

} // main
//------------------------------------------------------------------------------------------------------------------------
} // class PerformLayout
