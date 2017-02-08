/**
 * Created by rtholmes on 2016-10-28.
 */

import Log from '../Util';
let request = require('request');
import { config } from '../../config/env';
let rp = require('request-promise-native');

import { Helper } from '../Util';
import async = require('async');
import _ = require('lodash');
import fs = require('fs');

const pathToRoot = __dirname.substring(0, __dirname.lastIndexOf('classportal/')) + 'classportal/';

export default class GradeAssigner {

  private getStudentForGithub(github: string, studentData: any[]): number {
    for (let student of studentData) {
      if (student.username === github) {
        let sid = Number.parseInt(student.sid);
        Log.trace('getStudentForGithub( ' + github + ', ...) - success: ' + sid);

        return sid;
      }
    }
    Log.error('getStudentForGithub( ' + github + ', ...) - FAILED!');
    return -1;
    // throw new Error('Could not find student');
  }

  private getGradesForStudent(sid: number, gradeData: any[]): any[] {

    for (let grade of gradeData) {
      if (grade.sid === sid) {
        Log.trace('getGradesForStudent( ' + sid + ', ...) - success: ' + sid);
        return grade.grades;
      }
    }

    Log.error('getGradesForStudent( ' + sid + ', ...) - FAILED!');
    throw new Error('Could not find grades for student');
  }

  public assign(deliverableId: string, fName: string, writeToDisk: boolean) {
    try {

      let inpath = pathToRoot.concat(config.private_folder, fName);
      Log.info('path: ' + inpath);
      let inbuf = fs.readFileSync(inpath);
      Log.info('input data ready!');
      let inData = JSON.parse(inbuf.toString());

      let path = pathToRoot.concat(config.private_folder, 'grades.json');
      Log.info('path: ' + path);
      let buf = fs.readFileSync(path);
      Log.info('grade data ready!');
      let gradeData = JSON.parse(buf.toString());

      let spath = pathToRoot.concat(config.private_folder, 'students.json');
      Log.info('path: ' + path);
      let sbuf = fs.readFileSync(spath);
      let studentData = JSON.parse(sbuf.toString());
      Log.info('student data ready!');

      let updatedGrades: any[] = [];

      for (let row of inData.rows) {
        let github: string = row.key;
        let newGrade = row.value;
        let newGradeRecord = {
          assnId: deliverableId,
          autotest: row.value.testGrade + '',
          comment: '',
          coverage: Math.min(Number(row.value.coverGrade), 100) + '', // coverage can't be > 100
          grade: Math.round(Number(row.value.finalGrade)) + '',
          retrospective: ''
        };

        let sid = this.getStudentForGithub(github, studentData);
        if (sid > 0) {
          let gradeRows = this.getGradesForStudent(sid, gradeData);

          let found = false;
          for (let g of gradeRows) {
            if (g.assnId === deliverableId) {
              // g.assnId = // stays the same
              g.autotest = newGradeRecord.autotest;
              g.comment = newGradeRecord.comment;
              g.coverage = newGradeRecord.coverage;
              g.grade = newGradeRecord.grade;
              g.retrospective = newGradeRecord.retrospective;
              found = true;
              Log.trace('updating record for: ' + sid);
            }

          }
          if (found === false) {
            Log.trace('adding new record for: ' + sid);
            gradeRows.push(newGradeRecord);
          }
          let gradeRecord = { sid: sid + '', grades: gradeRows };
          updatedGrades.push(gradeRecord);
          Log.trace('current grade record: ' + JSON.stringify(gradeRecord));

          Log.trace('current grade record complete');
        } else {
          // student not in student file (happens if course is dropped)
        }
      }
      // Log.trace('row: ' + JSON.stringify(row));
      Log.trace('updating record set');
      if (writeToDisk === true) {
        Log.trace('Writing results to disk');
        Helper.addGrades(updatedGrades, function () {
          Log.trace('add record done');
        });
      } else {
        Log.warn('Results not written to disk (writeToDisk false)');
      }
      Log.trace('updating record set sent');

    } catch (err) {
      Log.error('error: ' + err);
    }
  }
}

let gec = new GradeAssigner();
gec.assign('d0', 'd0grades.json', true);
