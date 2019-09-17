# Classroom Helper

This is a collection of scripts scavenged for the itnernet that I use to make my life marginally easier when working with [Github Classroom](https://classroom.github.com/). It was originally forked from https://github.com/konzy/mass_clone in 2018 but I use the original shell scripts only rarely. 

Included in this repo are lightly modified shell scripts from the original repo  as well as `classroom-helper.js`, a node script which is the most useful object here (probably). It is unfortunately poorly-documented and a bit chaotic.  This readme is a work in progress and likely to be out of date, please feel free to ask questions or submit PR's.

## Configuration
You'll need to ocpy the `.env-sample` file to `.env` and update the variable values. If you run the script directly from your local repository (the new recommended method), you'll need a copy in that repository.  Some of the newer fuctions also make reference to an `Assignments.json` file; to use them, you'll need to generate that and put it in the right place.

The run `npm install`, you should be good. 

## One Repo or Many? 

In past years, I cloned everyone's repositories individually & ran npm install on each one.  This turns out to be a hassle, because `node_modules` can include tens of htousands offiles.  Still, it has some things going for it, including a somwhat more obvious workflow.

This year, in part because of some hassle with Github's new `template repoitories`, I am trying a nw system: I add every student repo as a remote to a pristine repo or my own (**not** my developmentrepo!). I make new branches tracking each of their master branches, run tests, save the results, and then go on to the next one.  I'm riggine my org-mode functions to check out the appropriate branches rather than navigate to different repositories. I'm hoping it will make things less chaotic in the long run.


### API

That's a bit of a laugh :-) but yes there are some functions exported by the module. Here's a list:

#### makeBranch (owner, repo, newbranch, oldref)

Creates a new branch NEWBRANCH in repo REPO, owned by OWNDER, branching at OLDREF. 

Low-level function mostly just wrapping Octokit. Useful for pull-requrest-comments marking, which is a straighforwardway of commentingo n student errors line by line.  


#### makePR  (owner, repo, head, base, title, body = '')

Creates a PR in the repo -- for the sam purpose as above.  


#### makeSubmissionBranches (assign,  baseDir, mainbranch = "master", comments="teacher-comments", submission='submission')

Specific to my workflow. this creates 2 nw branches, one `submission` which is locked at the point of submission, and the other `teacher-comments` which allows a PR discussion to take place. 

#### makeResubmitBranch (assign,  baseDir, studentID, resubNum )

Again, super specific to my teaching style, in which students can resubmit multiple times til lthey pass the assignment. 

#### makeResubmitPRs (assignment, org, baseDir, comments='teacher-comments', addRE)

uses `makePR` to make these resubmission branches I discussed. 

#### runTests(assign, baseDir)

**Designed for the multi-repo workflow**. This function iterates through a set ofstudent repos & runs all the unit tests. Accepts an `assignment` object that includes some fields I haven't documented yet.  

#### cloneRepos (assign, org, user, protocol, baseDir)

Again, **designed for the multi-repo workflow**. Get all the repos associated with the assignment, and lcone them in `BASEDIR`. 

####  getRepos (assign, org, user)

Workflow-agnostic. Just return an array of repos for a given assignment. Each repo is  a simple JS object w/ properties `url`, `namee`, and `student`, which can be extrapolated from the repo name. 


#### getAllAsBranches (assign,org,user )

Thee heart of **the new workflow**. Take an array of repos and iterate through them, adding their master brnaches as local branches in the single marking repo.

#### addRemoteasBranch (remoteUrl, remoteName) 

The worker that actually adds the remotes above. 

#### getReposAndUpdate (assign, org, user, protocol, baseDir, files)

Make the branches above but then check in the master version of  files listed in the array FILES, commit the changes and push back up to the student repos.  This exists mainly to make it possible to update student repos after the assignmenth as been created (usually to fix errors). 


#### updateRemoteFromMaster (remoteUrl, remoteName, files)

The worker function that actually dos the hard part of the above function. 

#### cloneAndUpdate (assign, org,  baseDir, upstream, gitref)

I think this is outdated now actually. 

#### installandLink
a horrible hack I no longer need, whew.  

#### testAndReport (assign, baseDir, outputFile = 'testresults.json')

Run tests and collect success. Hackish and unreliable. 

#### testAndReportBranch (assign, branch, id)

Rewrite of the above forhte new workflow. Seems a little better. 


A bunch of older stuff I'll document later if I have time befoer i rip it out... 

# Older scripts -- @konzy's work, for the most part

Many thanks to @konzy for getting me started with this. 

## mass_clone
This is a shell script that will clone multiple repositories.  The intended usage is for GitHub Classroom to be able to clone all repos of a certain assignment.  The script will create a folder based on the identifier(assignment name) then make folders for each repo then clone.  Uses GitHub api v3, curl 7.49.1 and grep 2.5.1

## clone_all.sh

This script takes 4 arguments in order to clone repos based on organization(github classroom), a unique identifier(assignment), username, and protocol.

This script will make a new folder based on the unique identifier, then clone each to their own subfolder.

If you would like to have osx remember your credentials to use https: https://help.github.com/articles/caching-your-github-password-in-git/

If you would like to setup an ssh key: https://help.github.com/articles/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent/

If you are running windows, here is a stack post that may help with ssh: https://stackoverflow.com/questions/18404272/running-ssh-agent-when-starting-git-bash-on-windows

##  push_all.sh

Adds all files, commits, then pushes all changes.

Takes 1 argument, the unique identifier(folder containing repos)

Used the commit message "Graded", but can be changed.

## clone_all_helper.sh

This script runs clone_all.sh with three arguments as defaults, Organization, username, and protocol

The script takes one argument, the unique identifier.
