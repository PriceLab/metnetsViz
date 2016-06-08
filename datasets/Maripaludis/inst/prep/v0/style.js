vizmap = [

   {selector: 'edge', css: {
      "line-color":  "rgb(192, 192, 192)",
      "source-arrow-shape": "none",
      "target-arrow-shape": "triangle",
      "target-arrow-color": "rgb(192, 192, 192)",
      width: "2px",
      "curve-style": "bezier",
      }},

   {selector: 'edge[fluxType="present"]', css: {
      "line-color": "mapData(flux, 0.5, 200, rgb(200,200,255), rgb(0, 0, 255))",
      "source-arrow-shape": "none",
      "target-arrow-shape": "triangle",
      "target-arrow-color": "rgb(192, 192, 192)",
      width: "10px"
      }},

   {selector: 'edge:selected', css: {
      "overlay-opacity": 0.2,
      "overlay-color": "gray"
      }},

   {selector: "node", css: {
      "text-valign":"center",
      "text-halign":"center",
      "content":"data(label)",
      "content": "data(label)",
      "background-color": "white",
      "border-color":"black","border-width":"1px",
      "width":"mapData(degree,0.0,50.0,20.0,300.0)",
      "height":"mapData(degree,0.0,50.0,20.0,300.0)",
      "font-size":"12px"}},

   //{"selector": "node[fluxType='positive']", "css" :{"background-color": "mapData(flux, 0.5, 200, white, red)"}},
   //{"selector": "node[fluxType='negative']", "css":{"background-color": "mapData(flux, -200, 0.5, green, white)"}},

   {selector: 'node[type="reaction"]', "css": {"shape": "octagon"}},

   {selector:"node:selected", css: {
       "text-valign":"center",
       "text-halign":"center",
       "border-color": "black",
       "content": "data(label)",
       "border-width": "3px",
       "overlay-opacity": 0.2,
       "overlay-color": "gray"
        }}
   ];
