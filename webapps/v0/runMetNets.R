library(ChinookServer)
stopifnot(packageVersion("ChinookServer") >= "1.0.7")
library(RUnit)
PORT=7001
datasets <- "Maripaludis"
analysisPackages <- c("ChinookLinearModel")
browserFile <- "index.html"
userCredentials <- "test@nowhere.net"
chinook <- ChinookServer(port=PORT, analysisPackages, datasets, browserFile, userCredentials)

if(Sys.info()[["nodename"]] != "eager.systemsbiology.net")
   browseURL(sprintf("http://localhost:%d", PORT))

run(chinook)
