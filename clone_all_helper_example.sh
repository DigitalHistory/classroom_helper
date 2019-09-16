#!/bin/sh

# Runs clone_all.sh with defaults, designed to be user editable

# Written By: Brian Konzman

DEFAULTDEADLINE="2018-01-28"
DEFAULTCOMMIT="3e49122ba8c9a2246935335b120b0e4ff3bc3220"
DEFAULTCOMMIT="6f9be15d7949c266ecda9394fcdcb6303042c648"
# pass two arguments to this function --
# $1 should be the name of the assignment
# $2 should be the deadline
# $3 should be the commit hash off which to fork.


# 
function make_forks () {
  assign=$1
  dead=$DEFAULTDEADLINE
  teach="341c083769b2d22c6acaf3765d743e3a85b0b406"
  for i in ${assign}-*
  do
    if [[ -d $i ]]
    then 
      cd $i
      echo "$i is a directory"
      # use git rev-list to grab the last commit before deadline. an imperfect solution!
      git branch submission `git rev-list --before=$dead -n 1 master`
      echo ""
      echo "HERE ARE THE MESSAGES FOR TEACHERCOMMENTS"
      echo ""
      git branch teacher-comments $teach
      # would be nice to pass a list of files instead of deleting everything
      # hoping this is sufficient for now. 
      # git rm -r .
      # git commit -a -m "emptying repository to facilitate comments"
      git push origin submission
      git push origin teacher-comments
      hub pull-request -h submission -b teacher-comments -m "Comments on your assignment" >> ../pull-request-list.txt
      cd ..
    fi
  done
  
}

function undo_errors () {
  assign=$1
  for i in ${assign}-*
  do
    if [[ -d $i ]]
    then 
      cd $i
      echo "$i is a directory"
      # use git rev-list to grab the last commit before deadline. an imperfect solution!
      git branch --delete submission
      git push --delete origin submission
      git branch --delete teacher-comments
      git push --delete origin teacher-comments
      
      # git push origin submission
      # git push origin teacher-comments
      # hub pull-request -h submission -b teacher-comments -m "Comments on your assignment" >> ../pull-request-list.txt
      cd ..
    fi
  done
  }

function run_tests () {
  assign=$1
  for i in ${assign}-*
  do
    if [[ -d $i ]]
    then 
      cd $i
      echo "$i is a directory"
      # use git rev-list to grab the last commit before deadline. an imperfect solution!
      npm install
      npm watch &
      firefox index.html
      # git push origin submission
      # git push origin teacher-comments
      # hub pull-request -h submission -b teacher-comments -m "Comments on your assignment" >> ../pull-request-list.txt
      cd ..
    fi
  done

  }

# if [[ $# -ne 1 ]];
# 	then
# 	echo ""
# 	echo "This script is designed to be edited by the user and will run clone_all.sh with defaults"
# 	echo ""
# 	echo "Please provide 1 parameter:"
# 	echo "1. Name of unique identifier(assignment)"
# else

  assignment=$1
  deadline=${2:-$DEFAULTDEADLINE}
  teachercommit=${3:-$DEFAULTCOMMIT}
  #edit these variables to your defaults
  organization="DigitalHistory"
  username="titaniumbones"
  protocol="ssh"
  ~/src/mass_clone/clone_all.sh ${organization} ${assignment} ${username} ${protocol}
  # make_forks $assignment $deadline "6f9be15d7949c266ecda9394fcdcb6303042c648"
  # run_tests $assignment
  # undo_errors ${assignment}
# fi


