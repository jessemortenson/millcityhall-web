const pluginRss = require("@11ty/eleventy-plugin-rss");
const xmlEscape = require('xml-escape');

module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(pluginRss);
  
  // Copy static assets
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/audio");
  eleventyConfig.addPassthroughCopy("src/CNAME");
  
  // Define episodes collection
  eleventyConfig.addCollection("episodes", function(collection) {
    return collection.getFilteredByGlob("src/episodes/*.md");
  });

  // Add date filter
  eleventyConfig.addFilter("date", function(date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  // Add XML escape filter using xml-escape package
  eleventyConfig.addFilter("xmlEscape", function(str) {
    if (!str) return '';
    return xmlEscape(str);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts"
    }
  };
}; 