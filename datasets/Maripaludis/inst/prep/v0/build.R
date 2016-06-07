library(RUnit)
library(XML)
library(RCyjs)
#------------------------------------------------------------------------------------------------------------------------
namespaces <-  c(sbml="http://www.sbml.org/sbml/level2",
                 xhtml="http://www.w3.org/1999/xhtml",
                 MathML="http://www.w3.org/1998/Math/MathML")
#------------------------------------------------------------------------------------------------------------------------
runTests <- function()
{
   test_getDoc();

   test_getMetaboliteInfo()
   test_createMetaboliteTable

   test_getGeneInfo()
   test_createGeneTable()

   test_getReactionInfo()
   test_createReactionTable()

   test_parseReaction()
   test_reactionsToInteractionsTable()

} # runTests
#------------------------------------------------------------------------------------------------------------------------
getDoc <- function(filename)
{
   stopifnot(file.exists(filename))
   xmlParse(filename)

} # getDoc
#------------------------------------------------------------------------------------------------------------------------
test_getDoc <- function()
{
   printf("--- test_getDoc")

   filename <- "2016_04_11_model.xml"
   doc <- getDoc(filename)
   checkTrue("XMLInternalDocument" %in% class(doc))
   checkTrue(length(getNodeSet(doc, "//reaction", namespaces)) > 600)

} # getDoc
#------------------------------------------------------------------------------------------------------------------------
getMetaboliteInfo <- function(metabolite)
{
   attributes <- xmlAttrs(metabolite)
   names <- names(attributes)
   stopifnot("id" %in% names)
   id <- attributes[["id"]]

   known.attributes <- c("name", "compartment", "hasOnlySubstanceUnits", "boundaryCondition", "constant")
   values <- as.list(c(id, rep(NA, length(known.attributes))))
   names(values) <- c("id", known.attributes)

   if("name" %in% names) values[["name"]] <- attributes[["name"]]
   if("compartment" %in% names) values[["compartment"]] <- attributes[["compartment"]]
   if("hasOnlySubstanceUnits" %in% names) values[["hasOnlySubstanceUnits"]] <-(attributes[["hasOnlySubstanceUnits"]] == "true")
   if("boundaryCondition" %in% names) values[["boundaryCondition"]] <- (attributes[["boundaryCondition"]] == "true")
   if("constant" %in% names) values[["constant"]] <- attributes[["constant"]] == "true"

   contents <- xmlSApply(getNodeSet(metabolite, "notes/body/p", namespaces), function(x) xmlValue(x))
     # for instance, this two element list: "FORMULA: C6H5O4"    "CHARGE: -1"
   tokens <- strsplit(contents, ": ")
   new.attribute.names  <- unlist(lapply(tokens, "[", 1))
   new.attribute.values <- unlist(lapply(tokens, "[", 2))
   for(i in 1:length(new.attribute.names))
      values[[new.attribute.names[i]]] <- new.attribute.values[[i]]
   as.data.frame(values, stringsAsFactors=FALSE)

} # getMetaboliteInfo
#------------------------------------------------------------------------------------------------------------------------
test_getMetaboliteInfo <- function(doc)
{
   printf("--- test_getMetaboliteInfo")
   file <- "2016_04_11_model.xml"
   doc <- getDoc(file)

   metabolites <- getNodeSet(doc, "//species", namespaces)  # 710
   metabolite.info <- lapply(metabolites[1:3], function(metabolite) getMetaboliteInfo(metabolite))
   checkEquals(length(metabolite.info), 3)

} # test_getMetaboliteInfo
#------------------------------------------------------------------------------------------------------------------------
createMetaboliteTable <- function(doc)
{
   metabolites <- getNodeSet(doc, "//species", namespaces)  # 710
   metabolite.info <- lapply(metabolites, function(metabolite) getMetaboliteInfo(metabolite))

   as.data.frame(do.call("rbind", metabolite.info), stringsAsFactors=FALSE)

} # createMetaboliteTable
#------------------------------------------------------------------------------------------------------------------------
test_createMetaboliteTable <- function()
{
   printf("--- test_createMetaboliteTable")
   file <- "2016_04_11_model.xml"
   doc <- getDoc(file)
   tbl.metabolites <- createMetaboliteTable(doc)
   checkTrue(nrow(tbl.metabolites) > 700)
   checkTrue(ncol(tbl.metabolites) == 8)

} # test_createMetaboliteTable
#------------------------------------------------------------------------------------------------------------------------

# genes and their cognate enzymes are not mentioned in listOfSpecies.  we must extract them from
# each reactions notes section:
#
#  <listOfReactions>
#   <reaction id="R_rxn02483_LSQBKT_c0_RSQBKT_" name="4-Carboxymuconolactone carboxy-lyase c0" reversible="false">
#    <notes>
#     <body xmlns="http://www.w3.org/1999/xhtml">
#      <p>GENE_ASSOCIATION: (mmp0807 or mmp0486)</p>
#      <p>SUBSYSTEM: Protocatechuate branch of beta-ketoadipate pathway</p>
#      <p>EC Number: |4.1.1.44|</p>
#     </body>
#    </notes>
#
getGeneInfo <- function(reaction)
{
   reaction.id <- xmlAttrs(reaction)[["id"]]
   notes <- xmlSApply(getNodeSet(reaction, "notes/body/p", namespaces), function(x) xmlValue(x))

   tokens <- strsplit(notes, ": ")

   gene.name.found <- grep("GENE_ASSOCIATION", tokens)
   subsystem.found <- grep("SUBSYSTEM", tokens)
   EC.found        <- grep("EC Number", tokens)

   if(!gene.name.found)
       return(data.frame())

   gene.value      <- ifelse(length(gene.name.found), tokens[[gene.name.found]][2], NA)
   subsystem.value <- ifelse(length(subsystem.found), tokens[[subsystem.found]][2], NA)
   ec.value <-       ifelse(length(EC.found), tokens[[EC.found]][2], NA)

   data.frame(gene=gene.value, subsystem=subsystem.value, ec=ec.value, reaction=reaction.id, stringsAsFactors=FALSE)

} # getGeneInfo
#------------------------------------------------------------------------------------------------------------------------
test_getGeneInfo <- function()
{
   printf("--- test_getGeneInfo")
   file <- "2016_04_11_model.xml"
   doc <- getDoc(file)
   reactions <- getNodeSet(doc, "//reaction", namespaces)  # 688
   gene.info <- lapply(reactions[1:3], function(reaction) getGeneInfo(reaction))
   checkEquals(length(gene.info), 3)
   checkTrue(is.data.frame(gene.info[[1]]))
   checkEquals(colnames(gene.info[[1]]), c("gene", "subsystem", "ec", "reaction"))
   checkEquals(gene.info[[1]][1,1], "(mmp0807 or mmp0486)")

} # test_getGeneInfo
#------------------------------------------------------------------------------------------------------------------------
createGeneTable <- function(doc)
{
   reactions <- getNodeSet(doc, "//reaction", namespaces)  # 688
   gene.info <- lapply(reactions, function(reaction) getGeneInfo(reaction))

   as.data.frame(do.call("rbind", gene.info), stringsAsFactors=FALSE)

} # createGeneTable
#------------------------------------------------------------------------------------------------------------------------
test_createGeneTable <- function()
{
   printf("--- test_createGeneTable")
   file <- "2016_04_11_model.xml"
   doc <- getDoc(file)
   tbl.genes <- createGeneTable(doc)
   checkTrue(nrow(tbl.genes) > 600)
   checkTrue(ncol(tbl.genes) >= 4)

} # test_createGeneTable
#------------------------------------------------------------------------------------------------------------------------
parseReaction <- function(reactionNode, quiet=FALSE)
{
   reaction.id <- xmlAttrs(reactionNode)[["id"]]
   reactants <- xmlSApply(getNodeSet(reactionNode, "listOfReactants/speciesReference"), function(x) xmlAttrs(x)[["species"]])
   products <-  xmlSApply(getNodeSet(reactionNode, "listOfProducts/speciesReference"), function(x) xmlAttrs(x)[["species"]])
   #printf("%s: (%s)[%d] -> (%s)[%d]", reaction.id, paste(reactants, collapse=","), length(reactants),
   #                                                paste(products,  collapse=","), length(products))
   #if(reaction.id == "R_rxn13782_LSQBKT_c0_RSQBKT_")
   #    browser()

   if(length(reactants) == 0 || length(products) == 0){
      if(!quiet) printf("skipping reaction %s, reactants: %d   products: %d", reaction.id, length(reactants), length(products))
      return(data.frame())
      }

   tbl.reactants <- data.frame(a=reactants, b=reaction.id, type="reactantsIn", stringsAsFactors=FALSE)
   tbl.products <- data.frame(a=products, b=reaction.id, type="productsOf", stringsAsFactors=FALSE)

   rbind(tbl.reactants, tbl.products)

} # parseReaction
#------------------------------------------------------------------------------------------------------------------------
test_parseReaction <- function(quiet=FALSE)
{
   printf("--- test_parseReaction")
   file <- "2016_04_11_model.xml"
   doc <- getDoc(file)
   reaction <- getNodeSet(doc, "//reaction", namespaces)[[1]]
   tbl.reaction <- parseReaction(reaction, quiet)
   checkEquals(colnames(tbl.reaction), c("a", "b", "type"))
   checkTrue(nrow(tbl.reaction) >= 4)
      # just one reaction id
   checkEquals(length(unique(tbl.reaction$b)), 1)

} # test_parseReaction
#------------------------------------------------------------------------------------------------------------------------
reactionsToInteractionsTable <- function(doc, quiet=FALSE)
{
   reactions <- getNodeSet(doc, "//reaction", namespaces)  # 688
   reaction.tbl.list <- lapply(reactions, function(reaction) parseReaction(reaction, quiet))
   do.call("rbind", reaction.tbl.list)

} # reactionsToInteractionsTable
#------------------------------------------------------------------------------------------------------------------------
test_reactionsToInteractionsTable <- function()
{
   printf("--- test_reactionsToInteractionsTable")
   file <- "2016_04_11_model.xml"
   doc <- getDoc(file)
   tbl <- reactionsToInteractionsTable(doc)
   checkEquals(colnames(tbl), c("a", "b", "type"))
   checkTrue(nrow(tbl) > 3000)

} # test_reactionsToInteractionsTable
#------------------------------------------------------------------------------------------------------------------------
# genes and their cognate enzymes are not mentioned in listOfSpecies.  we must extract them from
# each reactions notes section:
#
#  <listOfReactions>
#   <reaction id="R_rxn02483_LSQBKT_c0_RSQBKT_" name="4-Carboxymuconolactone carboxy-lyase c0" reversible="false">
#    <notes>
#     <body xmlns="http://www.w3.org/1999/xhtml">
#      <p>GENE_ASSOCIATION: (mmp0807 or mmp0486)</p>
#      <p>SUBSYSTEM: Protocatechuate branch of beta-ketoadipate pathway</p>
#      <p>EC Number: |4.1.1.44|</p>
#     </body>
#    </notes>
#
getReactionInfo <- function(reaction)
{
   attributes <- xmlAttrs(reaction)
   names <- names(attributes)
   stopifnot(all(c("id") %in% names))

   id <- attributes[["id"]]
   name <- NA
   if("name" %in% names)
       name <- attributes[["name"]]
   reversible <- NA
   if("reversible" %in% names)
      reversible <- attributes[["reversible"]] == "true";

   data.frame(id=id, name=name, reversible=reversible, stringsAsFactors=FALSE)

} # getReactionInfo
#------------------------------------------------------------------------------------------------------------------------
test_getReactionInfo <- function()
{
   printf("--- test_getReactionInfo")
   file <- "2016_04_11_model.xml"
   doc <- getDoc(file)
   reactions <- getNodeSet(doc, "//reaction", namespaces)  # 688
   reaction.info <- lapply(reactions[1:3], function(reaction) getReactionInfo(reaction))
   checkEquals(length(reaction.info), 3)
   checkTrue(is.data.frame(reaction.info[[1]]))
   checkEquals(reaction.info[[1]][1,1], "R_rxn02483_LSQBKT_c0_RSQBKT_")

} # test_getReactionInfo
#------------------------------------------------------------------------------------------------------------------------
createReactionTable <- function(doc)
{
   reactions <- getNodeSet(doc, "//reaction", namespaces)  # 688
   reaction.info <- lapply(reactions, function(reaction) getReactionInfo(reaction))

   as.data.frame(do.call("rbind", reaction.info), stringsAsFactors=FALSE)

} # createReactionTable
#------------------------------------------------------------------------------------------------------------------------
test_createReactionTable <- function()
{
   printf("--- test_createReactionTable")
   file <- "2016_04_11_model.xml"
   doc <- getDoc(file)
   tbl.reactions <- createReactionTable(doc)
   checkTrue(nrow(tbl.reactions) > 600)
   checkTrue(ncol(tbl.reactions) == 3)

} # test_createReactionTable
#------------------------------------------------------------------------------------------------------------------------
run <- function(view=TRUE, test=FALSE)
{
   file <- "2016_04_11_model.xml"
   stopifnot(file.exists(file))
   doc <- xmlParse(file)

   tbl.metabolites <- createMetaboliteTable(doc)
   tbl.genes <- createGeneTable(doc)
   tbl.reactions <- createReactionTable(doc)
   tbl.interactions <- reactionsToInteractionsTable(doc, quiet=TRUE)
   tbl.freq <- as.data.frame(table(c(tbl.interactions$a, tbl.interactions$b)))
   tbl.freq <- tbl.freq[order(tbl.freq$Freq, decreasing=TRUE),]
   most.connected <- subset(tbl.freq, Freq > 10)$Var1
   deleters.a <- which(tbl.interactions$a %in% most.connected)
   tbl.interactions <- tbl.interactions[-deleters.a,]

   write.table(tbl.interactions, file="interactions.tsv", sep="\t", quote=FALSE, row.names=FALSE,
               col.names=TRUE)
   tbl.flux <- read.table("2016_05_12_fluxes.txt", sep="\t", header=FALSE, stringsAsFactors=FALSE)
   colnames(tbl.flux) <- c("node", "flux")
   tbl.flux$rxShortName <- sub("[c0]", "", tbl.flux$node, fixed=TRUE)

   if(view){
      rcy <- view(tbl.interactions, tbl.reactions, tbl.genes, tbl.metabolites, tbl.flux, test=test)
      tbl.size <- getNodeSize(rcy)
      tbl.size$width <- as.integer(sub("px", "", tbl.size$width))
      tbl.size$height <- as.integer(sub("px", "", tbl.size$width))
      write.table(tbl.size, row.names=FALSE, col.names=FALSE, quote=FALSE, sep="\t", file="nodeSize.tsv")
      selectNodes(rcy, "R_rxn10542_LSQBKT_c0_RSQBKT_")  # has highest flux
      fit(rcy)
      return(rcy)
      }

} # run
#------------------------------------------------------------------------------------------------------------------------
exportNodeSizes <- function(rcy)
{
  tbl.size <- getNodeSize(rcy)
  tbl.size$width <- as.integer(sub("px", "", tbl.size$width))
  tbl.size$height <- as.integer(sub("px", "", tbl.size$width))
  write.table(tbl.size, row.names=FALSE, col.names=FALSE, quote=FALSE, sep="\t", file="nodeSize.tsv")

} # exportNodeSizes
#------------------------------------------------------------------------------------------------------------------------
view <- function(tbl.interactions, tbl.reactions, tbl.genes, tbl.metabolites, tbl.flux, test=FALSE)
{
   if(test)
       tbl.interactions <- tbl.interactions[1:100,]

   g <- toGraphNEL(tbl.interactions, tbl.reactions, tbl.genes, tbl.metabolites, tbl.flux)
   portRange <- 9047:9097
   rcy <<- RCyjs(portRange=portRange, quiet=TRUE, graph=g, hideEdges=FALSE);
   httpSetStyle(rcy, "style.js")

   rcy

} # view
#------------------------------------------------------------------------------------------------------------------------
toGraphNEL <- function(tbl.interactions, tbl.reactions, tbl.genes, tbl.metabolites, tbl.flux)
{
   g <- new("graphNEL", edgemode = "directed")

   nodeDataDefaults(g, attr = "type") <- "undefined"
   nodeDataDefaults(g, attr = "label") <- ""
   nodeDataDefaults(g, attr = "degree") <- 0
   nodeDataDefaults(g, attr = "fluxType") <- "missing"

   nodeDataDefaults(g, attr = "flux") <- 0.0

   edgeDataDefaults(g, attr = "edgeType") <- "undefined"
   edgeDataDefaults(g, attr = "flux") <- 0.0

   all.nodes <- unique(c(tbl.interactions$a, tbl.interactions$b))
   reactions <- unique(tbl.interactions$b)
   metabolites <- setdiff(all.nodes, reactions)

   g <- graph::addNode(all.nodes, g)
   nodeData(g, reactions, "type") <- "reaction"
   nodeData(g, metabolites, "type") <- "metabolite"

   metabolite.tbl.indices <- match(metabolites, tbl.metabolites$id)
   metabolite.names <- tbl.metabolites$name[metabolite.tbl.indices]
   nodeData(g, metabolites, "label") <- metabolite.names

   reaction.tbl.indices <- match(reactions, tbl.reactions$id)
   reaction.names <- tbl.reactions$name[reaction.tbl.indices]
   nodeData(g, reactions, "label") <- reaction.names

   tbl.flux$rxLongName <- NA
   reaction.rows <- grep("^rxn", tbl.flux$node)
   for(r in reaction.rows){
      short.name <- tbl.flux$rxShortName[r]
      reaction.full.name <- grep(short.name, reactions, value=TRUE)
      if(length(reaction.full.name) > 0)
          tbl.flux$rxLongName[r] <- reaction.full.name
      } # for r

   save(tbl.flux, file="tbl.flux.RData")

   g <- graph::addEdge(tbl.interactions$a, tbl.interactions$b, g)
   edgeData(g, tbl.interactions$a, tbl.interactions$b, "edgeType") <- tbl.interactions$type
   in.out.degree <- degree(g)
   node.degrees <- in.out.degree$inDegree + in.out.degree$outDegree
   nodeData(g, names(node.degrees), "degree") <- as.integer(node.degrees)
   tbl.flux <- subset(tbl.flux, abs(flux) > 0.5)

   flux.reactions <- tbl.flux$rxLongName[which(!is.na(tbl.flux$rxLongName))]
   tbl.interactionsWithFlux <- subset(tbl.interactions, b %in% flux.reactions)

   flux.values <- tbl.flux$flux[which(!is.na(tbl.flux$rxLongName))]
   #flux.sign <- flux.values >= 0
   #f2 <- fivenum(flux.values)
   #f3<- f2 + abs(min(f2)) + 1
   #f4 <- log(f3)
   #f5 <- f4 - log(3.2)  # this 3.2 almost restores the ratio of f2 max and min
   #flux.1 <- flux.values + 1 + abs(min(flux.values))
   #flux.2 <- log(flux.1)
   #flux.3 <- flux.2 - log(3.2)
   nodeData(g, flux.reactions, "flux") <- flux.values
   nodeData(g, flux.reactions[which(flux.values < 0)], "fluxType") <- "negative"
   nodeData(g, flux.reactions[which(flux.values > 0)], "fluxType") <- "positive"

   g

} # toGraphNEL
#------------------------------------------------------------------------------------------------------------------------
readAndApplyLayout <- function(rcy, filename)
{
   tbl <- read.table(filename, sep="\t", as.is=TRUE, header=TRUE)
   tbl$x <- as.integer(round(tbl$x))
   tbl$y <- as.integer(round(tbl$y))
   setPosition(rcy, tbl)

} # readAndApplyLayout
#------------------------------------------------------------------------------------------------------------------------
reproduce <- function()
{
   rcy <- run()
   readAndApplyLayout(rcy, "organicLayout.tsv");
   fit(rcy)
   g.json <- getJSON(rcy)  # character, nchar  758764
   save(g.json, file="maripaludis.v0.organic.RData")
   system("cp maripaludis.v0.organic.RData ../../extdata/")

   rcy

} #  reproduce
#------------------------------------------------------------------------------------------------------------------------
if(!interactive())
    reproduce()

# layout(rcy, "random")
# readAndApplyLayout(rcy, "organicLayout.tsv"); fit(rcy)
# readAndApplyLayout(rcy, "orthogonalLayout.tsv"); fit(rcy);
# readAndApplyLayout(rcy, "radialLayout.tsv")
