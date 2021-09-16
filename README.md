# Topical

An object-oriented topic modeler in JavaScript.

## Demo

If you have the ability to run JavaScript code using `node` and `npm` you can quickly see a demonstration of the topic modeling:

1. Clone this project
2. Create a `data` directory in the project root (it will be git-ignored)
3. Save two *plain text* files in the newly created `data` directory:
   * stopwords.txt: fill this file with prepositions!
   * documents.txt: add lots of plain text goodness here, long lines of sensible ramblings on matters far and wide!
4. Run the following commands in your terminal program...

```bash
$ npm install
$ bin/topics_demo
```

## Acknowledgments

The primary code for this project is derived from an object-oriented port of David Mimno's [jsLDA](https://github.com/mimno/jsLDA). The primary topic modeling class wraps the topic modeling code from jsLDA's jslda.js code in a JavaScript object for reuse.
