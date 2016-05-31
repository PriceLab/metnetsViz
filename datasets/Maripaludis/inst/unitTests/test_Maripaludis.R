library(RUnit)
library(Maripaludis)
library(RCurl)
library(jsonlite)
#----------------------------------------------------------------------------------------------------
# standardize alphabetic sort order
Sys.setlocale("LC_ALL", "C")
#----------------------------------------------------------------------------------------------------
printf <- function(...) print(noquote(sprintf(...)))
#----------------------------------------------------------------------------------------------------
runTests <- function()
{
  printf("=== test_Maripaludis.R, runTests()")

  testManifest()
  testConstructor();
  testSampleIdToSubjectId()

} # runTests
#----------------------------------------------------------------------------------------------------
testManifest <- function()
{
   printf("--- testManifest")
   dir <- system.file(package="Maripaludis", "extdata")
   checkTrue(file.exists(dir))

   file <- file.path(dir, "manifest.tsv")
   checkTrue(file.exists(file))

   tbl <- read.table(file, sep="\t", as.is=TRUE)
   checkTrue(nrow(tbl) >= 1)
   checkEquals(ncol(tbl), 11)
   checkEquals(colnames(tbl), c("variable", "class", "category", "subcategory",
                                "entity.count", "feature.count", "entity.type",
                                "feature.type", "minValue", "maxValue", "provenance"))

   expected.rownames <- c("metabolicNetwork.json.RData")

   checkTrue(all(expected.rownames %in% rownames(tbl)))

   expected.classes <- c("character")   # new ones may be added
   checkTrue(all(tbl$class %in% expected.classes))

   expected.categories <- c("network")

   checkTrue(all(expected.categories %in% tbl$category))


   for(i in 1:nrow(tbl)){
      file.name <- rownames(tbl)[i]
      full.name <- file.path(dir, file.name)
      variable.name <- tbl$variable[i]
      if(!grepl(".RData$", file.name))  # for example, do not load a json file
         next;
      checkEquals(load(full.name), variable.name)
        # get a handle on the variable, "x"
      eval(parse(text=sprintf("%s <- %s", "x", variable.name)))
      promised.class <- tbl$class[i]
      category <- tbl$category[i]
      subcategory <- tbl$subcategory[i]
      entity.count <- tbl$entity.count[i]
      feature.count <- tbl$feature.count[i]
      #printf("tbl row %d, promised.class = '%s'", i, promised.class)
      if(promised.class == "json")
          checkEquals(class(x[[1]]), "character")
      else
          checkEquals(class(x), promised.class)
      if(promised.class %in% c("matrix", "data.frame")){
         checkTrue(nrow(x) >= entity.count)
         checkTrue(ncol(x) >= feature.count)
         }
      entity.type <- tbl$entity.type[i]
      feature.type <- tbl$feature.type[i]
      minValue <- tbl$minValue[i]
      maxValue <- tbl$maxValue[i]
      if(promised.class == "matrix" && !is.na(minValue)){
         checkEqualsNumeric(min(x, na.rm=TRUE), minValue, tolerance=10e-5)
         checkEqualsNumeric(max(x, na.rm=TRUE), maxValue, tolerance=10e-5)
         }
      provenance <- tbl$provenance[i];
      # checkTrue(grepl("tcga", provenance))
      } # for i

   TRUE

} # testManifest
#----------------------------------------------------------------------------------------------------
testConstructor <- function()
{
   printf("--- testConstructor")
   dp <- Maripaludis();
   checkTrue(nrow(getManifest(dp)) >= 1)
   some.expected.names <- c("g.json")
   checkTrue(all(some.expected.names %in% getItemNames(dp)))
   g.json <- getItem(dp, "g.json")
   checkTrue("character" %in% is(g.json))

} # testConstructor
#----------------------------------------------------------------------------------------------------
testSampleIdToSubjectId <- function()
{
   printf("--- testSampleIdToSubjectId")

   dp <- Maripaludis();
   checkEquals(sampleIdToSubjectId(dp, "foo"), "foo")


} # testSampleIdToSubjectId
#----------------------------------------------------------------------------------------------------
if(!interactive())
   runTests()
