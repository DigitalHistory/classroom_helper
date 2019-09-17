const envFile = "/home/matt/DH/.env",
      shell = require('shelljs'),
      fs = require('fs'), path = require('path'),
      git = require('nodegit-kit'),
      jsonfile = require('jsonfile'),
      {GitProcess, GitError, IGitResult} = require('dugite');


const Octokit = require('@octokit/rest'),
      dotenv = require ('dotenv').config({path: envFile}),
      ghu = process.env.githubUsername,
      ghp = process.env.githubPassword,
      org = process.env.githubOrganization,
      token = process.env.ghOauth,
      ng = require('nodegit');

let  GP = GitProcess;

//might need to move this out elsewhere so I can
// initialize the octokit object somehow (!)
let octokit;

function initOcto (token) {
  octokit =   new Octokit(
    {auth: "token " + token}
  );
}


function cl (o) {
  console.log(JSON.stringify(o));
}



function branchAndPR (localpath, ghowner, ghrepo, base, head) {
  /** I had the idea of extracting some logic for individual branching operations to make it
      easier to do one-off regrades/resubmits. But I'm not quite sure what the right granularity level is
      so for now this does nothing :-/
  */
  
  console.log(`creating branch `);
}


/**
 * create a new branch NEWBRANCH in REPO, owned by OWNER, branching at OLDREF
 * 
 * @param {string} owner
 * @param {sring} repo
 * @param {string} newbranch
 * @param {string} oldref
 */

async function makeBranch (owner, repo, newbranch, oldref)   {
  let newRef;
  try {
  newRef = await octokit.gitdata.createReference({
    owner:  owner,
    repo: repo,
    ref: `refs/heads/${newbranch}`,
    sha: oldref
  });
  } catch (e) {
    if (JSON.parse(e.message).message == 'Reference already exists' ) {
      return true;
    } else {
      console.log(JSON.parse(e.message).message);
      return false;
    }
  } 
  return newRef;
}

/**
 * create pull request in REPO belonging to OWNER from HEAD onto BASE w/ TITLE and BODY
 * @param {} owner
 * @param {} repo
 * @param {} head
 * @param {} base
 * @param {} title
 * @param {} body
 */


async function makePR (owner, repo, head, base, title, body = '') {
  // would be nice to return an existing PR if this fails 
  let result;
  try {
    result = await octokit.pullRequests.create(
      {owner: owner,
       repo: repo,
       head: head,
       base: base,
       title: title,
       body: body});
  } catch(e) {
    // e.message will be a string whose content is valid JSON
    // so we can parse it with, e.g., JSON.parse(e.message)
    // the "message" attribute of this JSON blob may or may not be helpful
    // but e.g. JSON.parse(e.message).errors will be a list, usually with 1 member,
    // which will be an object with a 'message' attribute whose content may be
    // "No commits between ${base} and ${head}" or
    // "A pull request already exists for ${owner}:${head}"
    // would be nice to do something with these particular error types
    // e.g., at least if the PR already exists, we could get that PR object back

    // e.g.:
    let allErrs = JSON.parse(e.message).errors;
    for (let i of allErrs) {
      console.log(i.message);
      if (i.message.includes("A pull request already exists")) {
        console.log ("YES, EXISTS")
        try {
          const allPRs = await octokit.pullRequests.getAll({
            owner: owner,
            repo: repo,
            head: head,
            base: base
          });
          console.log(allPRs.data[0]);
          return allPRs.data[0];
        } catch (innerError) {
          console.log(`Tried to get existing PR but ended up with error: ${innerError}.`);
          return undefined;
        }
      } else {
        console.log(e);}
    }
    //console.log(e);
    result= e;
  }
  return result.data;
}

// makePR('DigitalHistory', 'advanced-topics', 'develop', 'submission-test', 'testing from cli', 'no body');


function makeSubmissionBranches (assign,  baseDir, mainbranch = "master", comments="teacher-comments", submission='submission') {
  /**
   * given an assignment object and a base directory, cd to the base directory and
   * iterate across all git repositories, creating both a "teacher-comments" branch and
   * a "subission" branch. Then push both branches to Github &  create a github PR
   * comparing them. Preserve the PR URL for later use.
   *
   * Should be updated to separate branch creation from PR creation, b/c the former requires
   * shell while the latter can be done w/ octokit.  A separate function therefore makes sense.  
   */
  shell.cd (baseDir + assign.basename);
  var listing = shell.ls();
  for (i of listing) {
    let p = baseDir + assign.basename + "/" + i;
    console.log(`\n\n**   INSIDE ${i}   **\n`);
    console.log(`Making branches for ${p}`);
    if (fs.lstatSync(p).isDirectory() && i.indexOf(assign.basename) != -1  && i != assign.basename) {
      shell.cd(i);
      console.log(`cding to ${i} to attempt ${comments} branch`);
      shell.exec(`git branch ${comments} ${assign.teacherCommit}`);
      shell.exec(`git fetch && git checkout --track origin/${mainbranch} || git checkout ${mainbranch}`)
      var lastGoodCommit = shell.exec(`git rev-list --before=${assign.deadline} -n 1 ${mainbranch}`).stdout.slice(0,-1);
      console.log(`attempting to branch ${submission} from commit number ${lastGoodCommit}`)
      shell.exec(`git checkout -b ${submission} ${lastGoodCommit}`);
      console.log('pushing branches & creating PR');
      shell.exec(`git push origin ${submission}; git push origin ${comments}; 
hub pull-request -h ${submission} -b ${comments} -m "comments on your assignment" >> ../pull-request-list.txt`);
      // convert to makePR - -but this requires using git to extract the repo name
      // for this we'll need nodegit, I think.
      // var r = new RegExp('github.com:(.*)/(.*).git');
      
      //makePR (org, )
      shell.cd ("..");
    }
  }
}

async function updateSubmissionBranch (repo, head, submission = 'submission') {
  const result = await octokit.repos.merge(
    {owner: 'DigitalHistory',
     repo: repo,
     base: submission,
     head: head,
     commit_message: `updating submissiont branch ${submission} with commits from ${head}.`});
  return result;
}


// function makeBranches (assign, baseDir, newBran)

function makeResubmitBranch (assign,  baseDir, studentID, resubNum ) {
  /**
   * Given an assignment object, a base directory, a student Github ID, and
   * the "number" of the resubmission (first, second, third), fetch that branch
   * from the appropriate remote repo & create a PR against teacher-comments.
   * It might be best actually, in future, to create a PR against the initial submission.
   */
  let p = baseDir + assign.basename + "/" + assign.basename + "-" + studentID;
  if (fs.lstatSync(p).isDirectory()  ) {
    shell.cd(p);
    console.log(`cding to ${p} to make new PR branch`);
    //shell.exec(`git branch teacher-comments ${assign.teacherCommit}`)
    // var lastGoodCommit = shell.exec(`git rev-list --before=${assign.deadline} -n 1 master`).stdout.slice(0,-1);
    // console.log(`attempting to branch  from commit number ${lastGoodCommit}`)
    //shell.exec(`git branch submission ${lastGoodCommit}`);
    shell.exec(`git checkout --track origin/resubmit-${resubNum}`);
    //hub pull-request 
    shell.exec(`hub pull-request -h resubmit-${resubNum} -b teacher-comments -m "comments on resubmission #${resubNum}" >> ../pull-request-resubmit-list.txt`);
    shell.cd ("..");
    
  }
}


async function makeResubmitPRs (assignment, org, baseDir, comments='teacher-comments', addRE) {
  /*
   * given an assignment object, an organization name, and a base direcotry
   * find all the existing resubmission branches, then iterate through them
   * and create PR's from the resubmission to the teacher-comments.
   * Then navigate to the local directory and check out the resubmisison branch
   * in preparation for marking.
   *
   * Brittly assumes the existence of the local repo, and does no error checking
   * on the PR. Could be massively improved, though checking for pre-existence of PR
   * will have substantial speed cost with little functionality gain. 
   */
  var resubs = await findResubmitBranches (org, assignment);
  //console.log(resubs);
  for (b of resubs) {
    if (addRE && b.branch.includes(addRE)) {
      let prData = await makePR(org, b.repo, b.branch, comments,
                                `Comments on your resubmisison branch ${b.branch}`);
      console.log(`\n\n**  making pr for b.repo   WITH ${prData}**\n`)
      shell.cd(baseDir + assignment.basename + "/" + b.repo);
      shell.exec(`git fetch && git checkout ${b.branch}`);
      if (prData ) {
        shell.exec(`echo "${prData.url}" >> ../resubmit-prs.txt`);
      } else {
        console.log(`Unable to create PR from ${b.branch} to ${comments} in REPO: ${b.repo}.\n\n`)
      }      
    }
  }
}


function runTests(assign, baseDir) {
  /**
   * Given an assignment object and a base directory, run tests in all student repos
   * inside the base directory.
   */
  shell.cd (baseDir + assign.basename);
  console.log("\n\n ** running all tests in " + shell.pwd());
  var listing = shell.ls();
  //console.log(listing);
  for (i of listing) {
    let p = baseDir + assign.basename + "/" + i;
    console.log(`\n\n * TESTS in ${i}`);
    if (i.indexOf(assign.basename) != -1 && fs.statSync(p).isDirectory()) {
      shell.cd (i)
      shell.exec("npm install && npm test &");
      shell.cd ("..");
      // shell.exec
    }
  }
}

function cloneRepos (assign, org, user, protocol, baseDir) {
  /**
   * Given an assignment object, and organization, a user, a protocol a base direcotry,
   * and a github password (!), clone all student repos for the assignment into a direcotry
   * *inside of* the base directory.
   *
   * It would be better to just define a github authentication object ocnsisting of
   * protocol, username, token/password, whatever.
   * but that is more difficult to do with a dotenv file. 
   */
  shell.mkdir(baseDir + assign.basename);
  shell.cd (baseDir + assign.basename);
  // console.log("Beginning mass clone in directory " + process.cwd());
  paginateGHResults(octokit.repos.getForOrg, {org: 'DigitalHistory', per_page: 100}).then(
    data => {
      let counter = 0;
      for (d of data) {
        console.log (d.name.indexOf(assign.basename));
        if (d.name.indexOf(assign.basename) != -1) {
          console.log(d.name);
          // console.log(d.clone_url);
          // console.log(process.cwd())
          shell.exec(`git clone ${d.ssh_url} ${baseDir}${assign.basename}/${d.name}`);
          counter += 1;
        }
      }
      console.log("there are this many repos: " + counter); 
    });
    // shell.exec (`~/src/mass_clone/clone_all.sh ${org} ${assign.basename} ${user} ${protocol}` );
}


function cloneAndUpdate (assign, org,  baseDir, upstream, gitref) {
  /**
   * given an assignment, an org, a baseDir, an upstream repo, and a git reference
   * (branch or commit) clone all assignment repos, checkout master, merge changes
   * from upstream, and push to origin
   */
  // cloneRepos(assign, org, null, null, baseDir, null);
    shell.cd (baseDir + assign.basename);
  var listing = shell.ls();
  for (i of listing) {
    let p = baseDir + assign.basename + "/" + i;
    console.log(`Making changes for ${p}`);
    if (fs.lstatSync(p).isDirectory() && i.indexOf(assign.basename) != -1 ) {
      shell.cd(i);
      console.log("adding remote");
      shell.exec(`git remote add upstream  ${upstream} && git fetch upstream `);
      console.log("merging");
      shell.exec(`git merge upstream/master`);
      // shell.exec(`git push origin submission; git push origin teacher-comments; hub pull-request -h submission -b teacher-comments -m "comments on your assignment" >> ../pull-request-list.txt`);
      // convert to makePR - -but this requires using git to extract the repo name
      // for this we'll need nodegit, I think.
      // var r = new RegExp('github.com:(.*)/(.*).git');
      
      //makePR (org, )
      shell.cd ("..");
    }
  }
}

function authenticateGH (user, pw) {
  /**
   * Just a simple authentication function. 
   */

  octokit.authenticate({
    type: 'basic',
    username: user,
    password: pw
  });
}

async function makePR (org, repo, head, base, title, body) {
  try {
    const pr = await octokit.pullRequests.create(
      {owner: org,
       repo: repo,
       base: base,
       head: head,
       title: title,
       body: body
      });
    console.log (pr.data);
    return pr.data
  } catch (err) {
    console.log("Unable to create PR due to errpr: " + err.message );
  }
}

async function makeManyPRs (org, assignment, head, base, title="Comments on your assignment", body=null) {
  let repos = await paginateGHResults(octokit.repos.getForOrg, {org: org, per_page: 100});
  let count = 0;
  for (let r of repos) {
    if (r.name.indexOf(assignment.basename) != -1 && r.name != assignment.basename) {
      let branches = await octokit.repos.getBranches({owner: org, repo: r.name, per_page:100});
      let hashead = false;
      let hasbase = false;
      for (b of branches.data) {
        if (b.name == head ) {
          hashead = true;
        } else if (b.name == base) {
          hasbase =true;
        }
      }
      if (hashead && hasbase) {
        //makePR (org, r.name, head, base, title, body);
        console.log(`${r.name} DOES have head branch ${head} and base branch ${base}.`  );
      } else {
        console.log(`${r.name} does not have head branch ${head} and base branch ${base}.`  );
      }
      //console.log(branches);
      count += 1;
    }
  }
  console.log(count);
     //   .then(
    // data => {
    //   let counter = 0;
    //   for (d of data) {
    //     console.log (d.name.indexOf(assignment.basename));
    //     if (d.name.indexOf(assignment.basename) != -1) {
    //       console.log(d.name);
    //       // console.log(d.clone_url);
    //       // console.log(process.cwd())
    //       shell.exec(`git clone ${d.ssh_url} ${baseDir}${assign.basename}/${d.name}`);
    //       counter += 1;
    //     }
    //   }
    //   console.log("there are this many repos: " + counter); 
    // });
}

async function paginateGHResults (method, args) {
  /**
   * Stolen from the octokit docs. An async function to retrieve all results from an
   * octokit query; a workaround for the github API's pagination mechanism. 
   */
  let response = await method(args)
  let {data} = response
  while (octokit.hasNextPage(response)) {
    response = await octokit.getNextPage(response)
    data = data.concat(response.data)
  }
  return data
}

async function findResubmitPRs (org, assign) {
/**
 * Given an org, find all repos with any kind of "resubmit" branch. Maybe would be nice
 * to order by date of creation or something. 
 */
  console.log("in resubmits");
  const allRepos = await paginateGHResults(octokit.repos.getForOrg, {org: org, per_page: 100});
  var myresult;
  
  for (r of allRepos) {
    if (r.name.includes(assign.basename)) {
      myresult = await octokit.pullRequests.getAll({owner: org, repo: r.name, per_page: 100});
      //console.log(myresult.data);
      for (p of myresult.data) {
        if (p.head.ref.indexOf("res") != -1){
          console.log(r.name + " " + p.head.ref + " PR url is: " + p.html_url );
          
        }
      }
    }
  }
}


async function findResubmitBranches (org, assignment) {
  /**
   * Given an org, find all repos with any kind of "resubmit" branch. Maybe would be nice
   * to order by date of creation or something. 
   */
  console.log("finding resubmit branches");
  const allRepos = await paginateGHResults(octokit.repos.getForOrg, {org: org, per_page: 100});
  
  var branches;
  var returnValue = [],
      outputFile = "./resubmits.json";
  
  for (r of allRepos) {
    // console.log(r);
    if (r.name.indexOf(assignment.basename) != -1) {
      branches = await octokit.repos.getBranches({owner: org, repo: r.name, per_page:100});
      for (b of branches.data) {
        //console.log(b);
        if (b.name.toLowerCase().indexOf("resub") != -1) {
          console.log (`Repo ${r.name} has a branch called ${b.name}`);
          let o = { repo: r.name, branch: b.name};
          returnValue.push(o);
        }
      }
    }
  }
  console.log(JSON.stringify(returnValue));
    jsonfile.writeFile(outputFile, returnValue, function(err) {console.log(err);});
  return returnValue;
}


// makeResubmitBranch (assignment, defaultBasedir, "mahdic", 1);
async function test() {
// var myresult = await octokit.pullRequests.create({owner: "DigitalHistory", repo: 'assignment-01-html-css', head: 'master', base: 'add-testing', title: 'just testing octokit', body: 'no body to speak of'});
}

// exports

for (f of  [makeBranch, makePR, makeManyPRs, makeSubmissionBranches, makeResubmitPRs, cloneAndUpdate, makePR, findResubmitPRs, findResubmitBranches, makeResubmitBranch, makeSubmissionBranches, authenticateGH, cloneRepos, runTests, paginateGHResults]) {
  exports[f.name] = f;
}











