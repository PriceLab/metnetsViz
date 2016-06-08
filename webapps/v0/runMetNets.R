library(ChinookServer)
stopifnot(packageVersion("ChinookServer") >= "1.0.8")
library(RUnit)
PORT=7002
datasets <- "Maripaludis"
analysisPackages <- c("ChinookLinearModel")
browserFile <- "index.html"
userCredentials <- "test@nowhere.net"
chinook <- ChinookServer(port=PORT, analysisPackages, datasets, browserFile, userCredentials)

hostname <- Sys.info()[["nodename"]]
if(!hostname %in% c("eager.systemsbiology.net", "buffy.systemsbiology.net"))
   browseURL(sprintf("http://localhost:%d", PORT))

run(chinook)
