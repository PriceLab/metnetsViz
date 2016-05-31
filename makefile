default:
	(export M4PATH=../../Chinook/inst/scripts:../../webapplets; m4 index.pre > index.html)
	R -f runMetNet.R

