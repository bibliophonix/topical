/*
    An object-oriented port of David Mimno's jsLDA:
    https://github.com/mimno/jsLDA (MIT License)
*/


const XRegExp = require("xregexp");
const util    = require("../helpers/util");


class TopicModeler {

    static correlationMinTokens = 2;
    static correlationMinProportion = 0.05;
    static wordPattern = XRegExp("\\p{L}[\\p{L}\\p{P}]*\\p{L}", "g");
    static topicWordSmoothing = 0.01;
    static documentTopicSmoothing = 0.1;

    constructor(stopwordsRaw, docsRaw) {
        this.stopwordsRaw = stopwordsRaw;
        this.docsRaw = docsRaw;

        this._numTopics = 10;
        this.vocabularySize = 0;
        this.vocabularyCounts = {};
        this.wordTopicCounts = {};
        this.topicWordCounts = {};
        this.tokensPerTopic = util.zeros(this._numTopics);
        this.topicWeights = util.zeros(this._numTopics);
        this.documents = [];
        this.stopwords = {};

        this._completeSweeps = 0;
        this._requestedSweeps = 0;
    }

    get numTopics() {
        return this._numTopics;
    }

    set numTopics(numTopics) {
        this._numTopics = numTopics;
    }

    get completeSweeps() {
        return this._completeSweeps;
    }

    set completeSweeps(completeSweeps) {
        this._completeSweeps = completeSweeps;
    }

    get requestedSweeps() {
        return this._requestedSweeps;
    }

    set requestedSweeps(requestedSweeps) {
        this._requestedSweeps = requestedSweeps;
    }

    processCorpus() {
        this.stopwordsRaw.forEach((w) => this.stopwords[w] = 1);
        this.docsRaw.forEach(doc => this.parseLine(doc));
        this.sortTopicWords();
    }

    parseLine(line) {
      if (line == "") { return; }
      var docID = this.documents.length;
      var docDate = "";
      var fields = line.split("\t");
      var text = fields[0];  // Assume there's just one field, the text
      if (fields.length == 3) {  // If it's in [ID]\t[TAG]\t[TEXT] format...
        docID = fields[0];
        docDate = fields[1]; // do not interpret date as anything but a string
        text = fields[2];
      }

      var tokens = [];
      var rawTokens = text.toLowerCase().match(TopicModeler.wordPattern);
      if (rawTokens == null) { return; }
      var topicCounts = util.zeros(this.numTopics);

      rawTokens.forEach((word) => {
        if (word !== "") {
          var topic = Math.floor(Math.random() * this.numTopics);

          if (word.length <= 2) { this.stopwords[word] = 1; }

          var isStopword = this.stopwords[word];
          if (isStopword) {

            // Record counts for stopwords, but nothing else
            if (! this.vocabularyCounts[word])
              this.vocabularyCounts[word] = 1;
            else
              this.vocabularyCounts[word] += 1;

          } else {

            if (! this.wordTopicCounts[word]) {
              this.wordTopicCounts[word] = {};
              this.vocabularySize++;
              this.vocabularyCounts[word] = 0;
            }

            if (! this.wordTopicCounts[word][topic])
              this.wordTopicCounts[word][topic] = 0;

            this.wordTopicCounts[word][topic] += 1;
            this.vocabularyCounts[word] += 1;
            topicCounts[topic] += 1;
          }
          tokens.push({"word":word, "topic":topic, "isStopword":isStopword });
        }
      });

      this.documents.push({
        "originalOrder" : this.documents.length,
        "id" : docID,
        "date" : docDate,
        "originalText" : text,
        "tokens" : tokens,
        "topicCounts" : topicCounts
      });
    }

    sortTopicWords() {
      this.topicWordCounts = {};
      for (var topic = 0; topic < this.numTopics; topic++)
        this.topicWordCounts[topic] = [];

      for (var word in this.wordTopicCounts)
        for (var topic in this.wordTopicCounts[word])
          this.topicWordCounts[topic].push({"word":word, "count":this.wordTopicCounts[word][topic]});

      for (var topic = 0; topic < this.numTopics; topic++)
        this.topicWordCounts[topic].sort(util.byCountDescending);
    }

    /*
     * Topic correlations:
     * This function will compute pairwise correlations between topics.
     * Unlike the correlated topic model (CTM) LDA doesn't have parameters
     * that represent topic correlations. But that doesn't mean that topics are
     * not correlated, it just means we have to estimate those values by
     * measuring which topics appear in documents together.
     */
    getTopicCorrelations() {

      // initialize the matrix
      let correlationMatrix = new Array(this.numTopics);
      for (var t1 = 0; t1 < this.numTopics; t1++)
        correlationMatrix[t1] = util.zeros(this.numTopics);

      var topicProbabilities = util.zeros(this.numTopics);

      // iterate once to get mean log topic proportions
      this.documents.forEach(function(d, i) {

        // We want to find the subset of topics that occur with non-trivial concentration in this document.
        // Only consider topics with at least the minimum number of tokens that are at least 5% of the doc.
        var documentTopics = new Array();
        // console.log("correlationMinTokens:" + correlationMinTokens + " correlationMinProportion:" + correlationMinProportion);
        var tokenCutoff = Math.max(correlationMinTokens, correlationMinProportion * d.tokens.length);

        for (var topic = 0; topic < this.numTopics; topic++) {
          if (d.topicCounts[topic] >= tokenCutoff) {
            documentTopics.push(topic);
            topicProbabilities[topic]++; // Count the number of docs with this topic
          }
        }

        // Look at all pairs of topics that occur in the document.
        for (var i = 0; i < documentTopics.length - 1; i++) {
          for (var j = i + 1; j < documentTopics.length; j++) {
            correlationMatrix[ documentTopics[i] ][ documentTopics[j] ]++;
            correlationMatrix[ documentTopics[j] ][ documentTopics[i] ]++;
          }
        }
      });

      for (var t1 = 0; t1 < this.numTopics - 1; t1++) {
        for (var t2 = t1 + 1; t2 < this.numTopics; t2++) {
          correlationMatrix[t1][t2] = Math.log((documents.length * correlationMatrix[t1][t2]) /
                                               (topicProbabilities[t1] * topicProbabilities[t2]));
          correlationMatrix[t2][t1] = Math.log((documents.length * correlationMatrix[t2][t1]) /
                                               (topicProbabilities[t1] * topicProbabilities[t2]));
        }
      }

      return correlationMatrix;
    }

    getCorrelationGraph(correlationMatrix, cutoff) {
      var graph = {"nodes": [], "links": []};

      for (var topic = 0; topic < this.numTopics; topic++)
        graph.nodes.push({"name": topic, "group": 1, "words": this.topNWords(this.topicWordCounts[topic], 3)});

      for (var t1 = 0; t1 < this.numTopics; t1++)
        for (var t2 = 0; t2 < this.numTopics; t2++)
          if (t1 !== t2 && correlationMatrix[t1][t2] > cutoff)
            graph.links.push({"source": t1, "target": t2, "value": correlationMatrix[t1][t2]});

      return graph;
    }

    topNWords(wordCounts, n) {
        return wordCounts.slice(0,n).map(d => d.word).join(" ");
    }

    sweep() {
        var startTime = Date.now();

        var topicNormalizers = util.zeros(this.numTopics);
        for (var topic = 0; topic < this.numTopics; topic++) {
            topicNormalizers[topic] = 1.0 / (this.vocabularySize * TopicModeler.topicWordSmoothing + this.tokensPerTopic[topic]);
        }

        for (var doc = 0; doc < this.documents.length; doc++) {
            var currentDoc = this.documents[doc];
            var docTopicCounts = currentDoc.topicCounts;

            for (var position = 0; position < currentDoc.tokens.length; position++) {
                var token = currentDoc.tokens[position];
                if (token.isStopword) { continue; }

                this.tokensPerTopic[ token.topic ]--;
                var currentWordTopicCounts = this.wordTopicCounts[ token.word ];
                currentWordTopicCounts[ token.topic ]--;
                // if (currentWordTopicCounts[ token.topic ] == 0) {
                //     //delete(currentWordTopicCounts[ token.topic ]);
                // }
                docTopicCounts[ token.topic ]--;
                topicNormalizers[ token.topic ] = 1.0 / (this.vocabularySize * TopicModeler.topicWordSmoothing + this.tokensPerTopic[ token.topic ]);

                var sum = 0.0;
                for (var topic = 0; topic < this.numTopics; topic++) {
                    if (currentWordTopicCounts[ topic ]) {
                        this.topicWeights[topic] = (TopicModeler.documentTopicSmoothing + docTopicCounts[topic]) * (TopicModeler.topicWordSmoothing + currentWordTopicCounts[ topic ]) * topicNormalizers[topic];
                    } else {
                        this.topicWeights[topic] = (TopicModeler.documentTopicSmoothing + docTopicCounts[topic]) * TopicModeler.topicWordSmoothing * topicNormalizers[topic];
                    }
                    sum += this.topicWeights[topic];
                }

                // Sample from an unnormalized discrete distribution
                var sample = sum * Math.random();
                var i = 0;
                sample -= this.topicWeights[i];
                while (sample > 0.0) {
                    i++;
                    sample -= this.topicWeights[i];
                }
                token.topic = i;

                this.tokensPerTopic[ token.topic ]++;
                if (! currentWordTopicCounts[ token.topic ]) {
                    currentWordTopicCounts[ token.topic ] = 1;
                } else {
                    currentWordTopicCounts[ token.topic ] += 1;
                }
                docTopicCounts[ token.topic ]++;

                topicNormalizers[ token.topic ] = 1.0 / (this.vocabularySize * TopicModeler.topicWordSmoothing + this.tokensPerTopic[ token.topic ]);
            }
        }

        //console.log("sweep in " + (Date.now() - startTime) + " ms");
        this.completeSweeps += 1;
        if (this.completeSweeps >= this.requestedSweeps) {
            this.sortTopicWords();
        }
    }
}


module.exports = TopicModeler;
