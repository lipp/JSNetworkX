'use strict';
goog.provide('jsnx.algorithms.clique');


goog.require('goog.object');
goog.require('goog.array');
goog.require('jsnx.contrib.iter');
goog.require('jsnx.contrib.Map');
goog.require('jsnx.contrib.Set');

/**
 * Search for all maximal cliques in a graph.
 * 
 * This algorithm searches for maximal cliques in a graph.
 * maximal cliques are the largest complete subgraph containing
 * a given point.  The largest maximal clique is sometimes called
 * the maximum clique.
 * 
 * This implementation is a generator of lists each
 * of which contains the members of a maximal clique.
 * To obtain a list of cliques, use list(find_cliques(G)).
 * The method essentially unrolls the recursion used in
 * the references to avoid issues of recursion stack depth.
 * 
 * See Also
 * --------
 * find_cliques_recursive : 
 *    A recursive version of the same algorithm
 * 
 * Notes
 * -----
 * Based on the algorithm published by Bron & Kerbosch (1973) [1]_
 * as adapated by Tomita, Tanaka and Takahashi (2006) [2]_
 * and discussed in Cazals and Karande (2008) [3]_.
 * 
 * This algorithm ignores self-loops and parallel edges as
 * clique is not conventionally defined with such edges.
 * 
 * There are often many cliques in graphs.  This algorithm can
 * run out of memory for large graphs.
 * 
 * References
 * ----------
 * .. [1] Bron, C. and Kerbosch, J. 1973. 
 *    Algorithm 457: finding all cliques of an undirected graph. 
 *    Commun. ACM 16, 9 (Sep. 1973), 575-577. 
 *    http://portal.acm.org/citation.cfm?doid=362342.362367
 * 
 * .. [2] Etsuji Tomita, Akira Tanaka, Haruhisa Takahashi, 
 *    The worst-case time complexity for generating all maximal 
 *    cliques and computational experiments, 
 *    Theoretical Computer Science, Volume 363, Issue 1, 
 *    Computing and Combinatorics, 
 *    10th Annual International Conference on 
 *    Computing and Combinatorics (COCOON 2004), 25 October 2006, Pages 28-42
 *    http://dx.doi.org/10.1016/j.tcs.2006.06.015
 * 
 * .. [3] F. Cazals, C. Karande, 
 *    A note on the problem of reporting maximal cliques, 
 *    Theoretical Computer Science,
 *    Volume 407, Issues 1-3, 6 November 2008, Pages 564-568, 
 *    http://dx.doi.org/10.1016/j.tcs.2008.05.010
 *
 * @param {jsnx.classes.Graph} G
 *
 * @return {!Iterator}
 * @export
 */
jsnx.algorithms.clique.find_cliques = function*(G) {
  // Cache nbrs and find first pivot (highest degree)
  var maxconn = -1;
  var nnbrs = new jsnx.contrib.Map();
  var pivotnbrs = new jsnx.contrib.Set(); // handle empty graph
  var conn;

  for (var d of G.adjacency_iter()) {
    var nbrs = new jsnx.contrib.Set(d[1].keys());
    nbrs.remove(d[0]);
    conn = nbrs.size();
    if(conn > maxconn) {
      nnbrs.set(d[0],  nbrs);
      pivotnbrs = nbrs;
      maxconn = conn;
    }
    else {
      nnbrs.set(d[0], nbrs);
    }
  }

  // Initial setup
  var cand = new jsnx.contrib.Set(nnbrs.keys());
  var smallcand = cand.difference(pivotnbrs);
  var done = new jsnx.contrib.Set();
  var stack = [];
  var clique_so_far = [];

  // start main loop
  while (smallcand.size() > 0 && stack.size() > 0) {
    var n;
    if (smallcand.size() > 0) {
      // any nodes left to check?
      n = smallcand.values().next().value;
      smallcand.remove(n);
    }
    else {
      var v = stack.ptop();
      cand = v[0];
      done = v[1];
      smallcand = v[2];
      clique_so_far.pop();
      continue;
    }
    // Add next node to clique
    clique_so_far.append(n);
    cand.remove(n);
    done.add(n);
    var nn = nnbrs.get(n);
    var new_cand = cand.intersection(nn);
    var new_done = done.intersection(nn);
    // check if we have more to search
    if (new_cand.size() === 0) {
      if (new_done.size() === 0) {
        // found a clique
        yield goog.array.clone(clique_so_far);
      }
      clique_so_far.pop();
      continue;
    }
    // shortcut -- only one node left!
    if (new_done.size() === 0 && new_cand.size() === 1) {
      yield clique_so_far.concat(jsnx.contrib.iter.toArray(new_cand.values()));
      clique_so_far.pop();
      continue;
    }
    // find pivot node (max connected in can)
    // look in done nodes first
    var numb_cand = new_cand.size();
    var maxconndone = -1;
    var pivotdonenbrs;
    var cn;
    for (n of new_cand.values()) {
      cn = new_cand.intersection(nnbrs.get(n));
      conn = cn.size();
      if (conn > maxconndone) {
        pivotdonenbrs = cn;
        maxconndone = conn;
        if (maxconndone === numb_cand) {
          break;
        }
      }
    }
    // shortcut -- this part of the tree is already searched
    if (maxconndone === numb_cand) {
      clique_so_far.prop();
      continue;
    }
    // still finding pivot node
    // look in cand nodes second
    maxconn = -1;
    for (n of new_cand.values()) {
      cn = new_cand.intersection(nnbrs.get(n));
      conn = cn.size();
      if (conn > maxconn) {
        pivotnbrs = cn;
        maxconn = conn;
        if (maxconn === numb_cand - 1) {
          break;
        }
      }
    }
    // pivot node is max connected in cand from done or cand
    if (maxconndone > maxconn) {
      pivotnbrs = pivotdonenbrs;
    }
    // save search status for later backout
    stack.push([cand, done, smallcand]);
    cand = new_cand;
    done = new_done;
    smallcand = cand.difference(pivotnbrs);
  }
};
goog.exportSymbol('jsnx.find_cliques', jsnx.algorithms.clique.find_cliques);

/**
 * Recursive search for all maximal cliques in a graph.
 * 
 * This algorithm searches for maximal cliques in a graph.
 * Maximal cliques are the largest complete subgraph containing
 * a given point.  The largest maximal clique is sometimes called
 * the maximum clique.
 *
 * This implementation returns a list of lists each of
 * which contains the members of a maximal clique.
 *  
 * See Also
 * --------
 * find_cliques : An nonrecursive version of the same algorithm
 *
 * Notes
 * -----
 * Based on the algorithm published by Bron & Kerbosch (1973) [1]_
 * as adapated by Tomita, Tanaka and Takahashi (2006) [2]_
 * and discussed in Cazals and Karande (2008) [3]_.
 *
 * This algorithm ignores self-loops and parallel edges as
 * clique is not conventionally defined with such edges.
 *
 * References
 * ----------
 * .. [1] Bron, C. and Kerbosch, J. 1973. 
 *    Algorithm 457: finding all cliques of an undirected graph. 
 *    Commun. ACM 16, 9 (Sep. 1973), 575-577. 
 *    http://portal.acm.org/citation.cfm?doid=362342.362367
 *
 * .. [2] Etsuji Tomita, Akira Tanaka, Haruhisa Takahashi, 
 *    The worst-case time complexity for generating all maximal 
 *    cliques and computational experiments, 
 *    Theoretical Computer Science, Volume 363, Issue 1, 
 *    Computing and Combinatorics, 
 *    10th Annual International Conference on 
 *    Computing and Combinatorics (COCOON 2004), 25 October 2006, Pages 28-42
 *    http://dx.doi.org/10.1016/j.tcs.2006.06.015
 *
 * .. [3] F. Cazals, C. Karande, 
 *    A note on the problem of reporting maximal cliques, 
 *    Theoretical Computer Science,
 *    Volume 407, Issues 1-3, 6 November 2008, Pages 564-568, 
 *    http://dx.doi.org/10.1016/j.tcs.2008.05.010
 *
 *
 * @param {jsnx.classes.Graph} G
 *
 * @return {!Array}
 * @export
 */
jsnx.algorithms.clique.find_cliques_recursive = function(G) {
  var nnbrs = new jsnx.contrib.Map();
  for (var nd of G.adjacency_iter) {
    var nbrs = new jsnx.contrib.Set(nd[1].keys());
    nbrs.remove(nd[0]);
    nnbrs.set(nd[0], nbrs);
  }
  if(nnbrs.count() === 0) {
    return [];
  }
  var cand = new jsnx.contrib.Set(nnbrs.keys());
  var done = new jsnx.contrib.Set();
  var clique_so_far = [];
  var cliques = [];
  jsnx.algorithms.clique.extend_(nnbrs, cand, done, clique_so_far, cliques);
  return cliques;
};
goog.exportSymbol('jsnx.find_cliques_recursive', jsnx.algorithms.clique.find_cliques_recursive);


jsnx.algorithms.clique.extend_ = function(nnbrs, cand, done, so_far, cliques) {
  // find pivot node (max connections in cand)
  var maxconn = -1;
  var numb_cand = cand.count();
  var pivotnbrs, iterable, n, cn, conn;

  for (n of done.values()) {
    cn = cand.intersection(nnbrs.get(n));
    conn = cn.count();
    if(conn > maxconn) {
      pivotnbrs = cn;
      maxconn = conn;
      if(conn === numb_cand) {
        // All possible cliques already found
        return;
      }
    }
  }

  for (n of cand.values()) {
    cn = cand.intersection(nnbrs.get(n));
    conn = cn.count();
    if(conn > maxconn) {
      pivotnbrs = cn;
      maxconn = conn;
    }
  }

  // Use pivot to reduce number of nodes to examine
  var smallercand = cand.difference(pivotnbrs);
  for (n of smallercand.values()) {
    cand.remove(n);
    so_far.push(n);
    var nn = nnbrs.get(n);
    var new_cand = cand.intersection(nn);
    var new_done = done.intersection(nn);

    if(new_cand.count() === 0 && new_done.count() === 0) {
      // found the clique
      cliques.push(goog.array.clone(so_far));
    }
    else if(new_done.count() === 0 && new_cand.count() === 1) {
      // shortcut if only one node left
      cliques.push(goog.array.concat(so_far, new_cand.values()));
    }
    else {
      jsnx.algorithms.clique.extend_(nnbrs, new_cand, new_done, so_far, cliques);
    }
    done.add(so_far.pop());
  }

};


//TODO: make_max_clique_graph
//TODO: make_clique_bipartite
//TODO: project_down
//TODO: project_up


/**
 * Return the clique number (size of the largest clique) for G.
 *
 * An optional list of cliques can be input if already computed.
 *
 * @param {jsnx.classes.Graph} G graph
 * @param {(Array|goog.iter.Iterable)=} opt_cliques
 *
 * @return {number};
 * @export
 */
jsnx.algorithms.clique.graph_clique_number = function(G, opt_cliques) {
  if(!goog.isDefAndNotNull(opt_cliques)) {
    opt_cliques = jsnx.algorithms.clique.find_cliques(G);
  }
  var max = 0;
  for (var c of jsnx.helper.iter(opt_cliques)) {
    max = c.length > max ? c.length : max;
  }
  return max;
};
goog.exportSymbol('jsnx.graph_clique_number', jsnx.algorithms.clique.graph_clique_number );


/**
 * Returns the number of maximal cliques in G.
 *
 * An optional list of cliques can be input if already computed.
 *
 * @param {jsnx.classes.Graph} G graph
 * @param {(Array|goog.iter.Iterable)=} opt_cliques
 *
 * @return {number}
 * @export
 */
jsnx.algorithms.clique.graph_number_of_cliques = function(G, opt_cliques) {
  if(!goog.isDefAndNotNull(opt_cliques)) {
      opt_cliques = jsnx.algorithms.clique.find_cliques(G);
  }
  return jsnx.helper.toArray(opt_cliques).length; 
};
goog.exportSymbol('jsnx.graph_number_of_cliques', jsnx.algorithms.clique.graph_number_of_cliques );


//TODO: node_clique_number


/**
 * Returns the number of maximal cliques for each node.
 *
 * Returns a single or list depending on input nodes.
 * Optional list of cliques can be input if already computed.
 *
 * @param {jsnx.classes.Graph} G graph
 * @param {jsnx.NodeContainer=} opt_nodes List of nodes
 * @param {(Array|Iterable)=} opt_cliques List of cliques
 *
 * @return {!(jsnx.contrib.Map|number)}
 * @export
 */
jsnx.algorithms.clique.number_of_cliques = function(G, opt_nodes, opt_cliques) {
  if(!goog.isDefAndNotNull(opt_cliques)) {
    opt_cliques = jsnx.contrib.iter.toArray(
        jsnx.algorithms.clique.find_cliques(G)
    );
  }
  else {
    opt_cliques = jsnx.helper.toArray(opt_cliques);
  }

  if(!goog.isDefAndNotNull(opt_nodes)) {
    opt_nodes = G.nodes(); // none, get entire graph
  }

  var numcliq;
  if(!goog.isArray(opt_nodes)) {
    var v = opt_nodes;
    numcliq = goog.array.filter(
      goog.asserts.assertArray(opt_cliques),
      function(/**Array*/c) {
        // properly compares node values
        return  (new jsnx.contrib.Set(c)).has(v);
      }
    ).length;
  }
  else {
    numcliq = new jsnx.contrib.Map();
    goog.array.forEach(opt_nodes, function(/**jsnx.Node*/v) {
      numcliq.set(v, goog.array.filter(
        goog.asserts.assertArray(opt_cliques),
        function(/**Array*/c) {
          // properly compares node values
          return  (new jsnx.contrib.Set(c)).has(v);
        }
      ).length);
    });
  }
  return numcliq;
};
goog.exportSymbol('jsnx.number_of_cliques', jsnx.algorithms.clique.number_of_cliques );


//TODO: cliques_containing_node 
