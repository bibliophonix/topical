// Helper methods

module.exports = {
    byCountDescending: (a,b) => b.count - a.count,
    zeros:             (n)   => new Array(n).fill(0.0)
}
