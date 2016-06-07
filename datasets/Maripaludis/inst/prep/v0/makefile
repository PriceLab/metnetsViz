JC=javac -Xlint:unchecked
JI=java
CP=/Users/paul/jars/yfiles-for-java.jar:.:/Users/paul/s/work/yfiles/v3.0/yFiles-for-Java-Complete-3.0-Evaluation/tutorials:/Users/paul/jars/opencsv-3.7.jar
#CP=/Users/paul/s/work/yfiles/v3.0/yFiles-for-Java-Complete-3.0-Evaluation/tutorials:/Users/paul/jars/opencsv-3.7.jar:.

.SUFFIXES: .java .class

OBJS = PerformLayout.class

default: $(OBJS)
	$(JI) -cp $(CP) PerformLayout

.java.class:
	$(JC) -cp $(CP) $<


