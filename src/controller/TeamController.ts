/**
 * Created by rtholmes on 2016-06-19.
 */

import fs = require('fs');
import Log from '../Util';
import { Helper } from '../Util';
import async = require('async');

const pathToRoot = __dirname.substring(0, __dirname.lastIndexOf('classportal/')) + 'classportal/';
let config = require(pathToRoot + 'config.json');

export default class TeamController {

  /**
   * add new entry to teams.json
   * set "hasTeam":true in students.json for each member
   *
   * @param
   * @returns
   */
  public static createTeam(username: string, namesArray: any[], appName: string, appDescription: string, parentCallback: any) {
    // store these variables here for repeated access in the async waterfall.
    let studentsFile: any;
    let teamsFile: any;
    let sidArray: string[] = [];
    let newTeamId: number;

    async.waterfall([
      function get_student_file(callback: any) {
        Log.trace('TeamController::createTeam| get_student_file');
        Helper.readJSON('students.json', function (error: any, data: any) {
          if (!error) {
            studentsFile = data;
            return callback(null);
          } else {
            return callback('could not read students file');
          }
        });
      },
      function get_teams_file(callback: any) {
        Log.trace('TeamController::createTeam| get_teams_file');
        Helper.readJSON('teams.json', function (error: any, data: any) {
          if (!error) {
            teamsFile = data;

            // set newId to the 1 higher than the last entry in the array.
            if (teamsFile.length > 0) {
              let currentHighestId: number = teamsFile[teamsFile.length - 1].id;
              newTeamId = currentHighestId + 1;
              return callback(null);
            } else {
              // if teams file is empty, set id to 1.
              newTeamId = 1;
              return callback(null);
            }
          } else {
            return callback('could not read teams file');
          }
        });
      },
      function convert_names_to_sids(callback: any) {
        Log.trace('TeamController::createTeam| convert_names_to_sids');

        // check each value in namesArray against student file
        for (let i = 0; i < namesArray.length; i++) {
          for (let j = 0; j < studentsFile.length; j++) {
            if (namesArray[i] === studentsFile[j].firstname + ' ' + studentsFile[j].lastname) {
              sidArray[i] = studentsFile[j].sid;
              break;
            }
          }
        }
        return callback(null);
      },
      function add_team_entry(callback: any) {
        Log.trace('TeamController::createTeam| add_team_entry');
        let empty: any[] = [];
        let newTeam = {
          'id': newTeamId,
          'url': '',
          'members': sidArray,
          'appName': '',
          'appDescription': '',
          'comments': empty
        };
        if (!!config['enable_app_store']) {
          newTeam['url'] = '';
          newTeam['appName'] = appName;
          newTeam['appDescription'] = appDescription;
        }

        Helper.addEntry('teams.json', newTeam, function (error: any) {
          if (!error) {
            return callback(null);
          } else {
            return callback('could not add new team');
          }
        });
      },
      function update_hasTeam_status(callback: any) {
        Log.trace('TeamController::createTeam| update_hasTeam_status');
        TeamController.updateHasTeamStatus(sidArray, true, function (error: any) {
          if (!error) {
            return callback(null);
          } else {
            return callback('could not update hasTeam statuses');
          }
        });
      }
    ],
      function async_end(error: any, data: any) {
        if (!error) {
          Log.trace('TeamController::createTeam| Success');
          return parentCallback(null, newTeamId);
        } else {
          Log.trace('TeamController::createTeam| Error: ' + error);
          return parentCallback(error, null);
        }
      }
    );
  }

  // helper to update students to hasTeam
  public static updateHasTeamStatus(sidArray: any[], newStatus: boolean, parentCallback: any) {
    Log.trace('TeamController::updateHasTeamStatus| Updating..');

    async.waterfall([
      function update_first_hasTeam(callback: any) {
        Log.trace('TeamController::updateHasTeamStatus| update_first_hasTeam');
        Helper.updateEntry('students.json', { 'sid': sidArray[0] }, { 'hasTeam': newStatus }, function (error: any) {
          if (!error) {
            return callback(null);
          } else {
            return callback('error');
          }
        });
      },
      function update_second_hasTeam(callback: any) {
        Log.trace('TeamController::updateHasTeamStatus| update_second_hasTeam');
        Helper.updateEntry('students.json', { 'sid': sidArray[1] }, { 'hasTeam': newStatus }, function (error: any) {
          if (!error) {
            return callback(null);
          } else {
            return callback('error');
          }
        });
      }
    ],
      function end_async(error: any) {
        if (!error) {
          Log.trace('TeamController::updateHasTeamStatus| Success');
          return parentCallback(null);
        } else {
          Log.error('TeamController::updateHasTeamStatus| Error: ' + error);
          return parentCallback('error');
        }
      }
    );
  }

  /**
   * Disband a team by deleting the entry from teams.json
   * and setting 'hasTeam':false for each team member.
   *
   * @param teamId
   * @returns
   */
  public static disbandTeam(teamId: number, parentCallback: any) {
    Log.trace('TeamController::disbandTeam| Disbanding team ' + teamId);
    let sidArray: any[] = [];

    async.waterfall([
      function get_team_sids(callback: any) {
        Log.trace('TeamController::disbandTeam| get_team_sids');
        Helper.checkEntry('teams.json', { 'id': teamId }, function (error: any, teamFile: any) {
          if (!error) {
            sidArray = teamFile.members;
            return callback(null);
          } else {
            return callback('error getting team members');
          }
        });
      },
      function delete_team_entry(callback: any) {
        Log.trace('TeamController::disbandTeam| delete_team_entry');
        Helper.deleteEntry('teams.json', { 'id': teamId }, function (error: any) {
          if (!error) {
            return callback(null);
          } else {
            return callback('error deleting team entry');
          }
        });
      },
      function set_hasTeam_false(callback: any) {
        Log.trace('TeamController::disbandTeam| set_hasTeam_false');
        TeamController.updateHasTeamStatus(sidArray, false, function (error: any) {
          if (!error) {
            return callback(null);
          } else {
            return callback('error setting hasTrue statuses');
          }
        });
      }
    ],
      function end_async(error: any) {
        if (!error) {
          Log.trace('TeamController::disbandTeam| Success!');
          return parentCallback(null, true);
        } else {
          Log.error('TeamController::disbandTeam| Error: ' + error);
          return parentCallback(true, null);
        }
      }
    );
  }

  /**
   * Submmit a comment to the app store
   *
   * @param username, appID, ratting, comment
   * @returns
   */
  public static submitComment(username: string, appID: string, ratting: string, comment: string, callback: any) {
    Log.trace('AdminController::submitComment(..) - start');

    Helper.checkEntry('students.json', { 'username': username }, function (error: any, response: any) {
      if (!error) {
        Helper.addComment(response.sid, appID, ratting, comment, function (error: any, data: any) {
          if (!error) {
            return callback(null, 'success!');
          } else {
            // return error
            return callback('Error while submiting your comment');
          }
        });
      } else {
        Log.trace('AdminController::submitComment(..)| Error: Student is not enrolled.');
        return callback('student is not enrolled', null);
      }
    });
  }
}
