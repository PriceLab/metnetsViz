#----------------------------------------------------------------------------------------------------
printf = function (...) print (noquote (sprintf (...)))
#----------------------------------------------------------------------------------------------------
.Maripaludis <- setClass ("Maripaludis", contains = "Dataset")
#----------------------------------------------------------------------------------------------------
# constructor
Maripaludis <- function()
{
  dir <- system.file(package="Maripaludis", "extdata")
  stopifnot(file.exists(dir))
  full.path <- file.path(dir, "manifest.tsv")
  stopifnot(file.exists(full.path))

  manifest <- read.table(full.path, sep="\t", header=TRUE, as.is=TRUE);
  result <- Dataset:::.loadFiles(dir, manifest)

  .Maripaludis(Dataset(name="Maripaludis", manifest=manifest,
                             history=result$subjectHistory,
                             dictionary=result$dictionary))

} # Maripaludis constructor
#----------------------------------------------------------------------------------------------------
setMethod("show", "Maripaludis",

  function (obj) {
     contents <- paste(manifest(obj)$variable, collapse=", ")
     msg <- sprintf("Maripaludis: %s", contents);
     cat (msg, "\n", sep="")
     })

#----------------------------------------------------------------------------------------------------
setMethod('sampleIdToSubjectId', "Maripaludis",

  function (obj, sample.ids) {
     sample.ids
     })

#----------------------------------------------------------------------------------------------------
