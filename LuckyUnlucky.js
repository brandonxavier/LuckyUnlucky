
/**
 * Created with JetBrains WebStorm
 * User: brandonxavier (brandonxavier421@gmail.com)
 * Date: 6/1/13
 *

 Copyright 2013 Brandon Xavier (brandonxavier421@gmail.com)

 This file is part of ${PROJECT_NAME}.

 ${PROJECT_NAME} is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 ${PROJECT_NAME} is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with ${PROJECT_NAME}.  If not, see <http://www.gnu.org/licenses/>.

 */

//
// goodbadluck.js
//
// Version:     1.2

// The standard "guess a number" game with a slight twist:  If an unlucky
// number is guessed, the numbers start over from scratch.  Additionally,
// unless the "lucky" number is equal to the min, the unlucky number will
// always be lower than the lucky number (to foil those who start at the bottom
// and always guess the next lowest number)
//
// Version 1.2
//      - Added optout option
//      - Allowed for auto play of larger tips
//      - Fixed game over bug
//      - Change some chatNotice options
//
// Version 1.1
//      - Added /rules command to show app details to the intuitionally-challenged
//      - Changed panel to not always group blocks of numbers
//      - Increased upper limit to 500
//      - Replays the opening banner every 5 minutes (someday CB will add an onEnter
//        function to allow only showing to new users, but until then, this is what we got
//      - Minor cosmetic fixes
//
// Version 1.0
//      - Initial Release

// vars
var lucky = 0;
var unlucky = 0;
var remaining = 0;
var picked = [];
var ostr = "";
var space20 = "                    ";
var net = 0, bonus = 0;

var bcp = {
    aqua: "#00FFFF",
    black: "#000000",
    blue: "#0000FF",
    fuchsia: "#FF00FF",
    gray: "#808080",
    grey: "#808080",
    green: "#008000",
    lime: "#00FF00",
    maroon: "#800000",
    navy: "#000080",
    olive: "#808000",
    orange: "#FFA500",
    purple: "#800080",
    red: "#FF0000",
    silver: "#C0C0C0",
    teal: "#008080",
    white: "#FFFFFF",
    yellow: "#FFFF00"
};

cb.settings_choices = [
    {name: 'lowlimit', type: 'int', minValue: 5, maxValue: 499, defaultValue: 11,
        label: "Lower Limit: "},
    {name: 'highlimit', type: 'int', minValue: 10, maxValue: 500, defaultValue: 20,
        label: "Upper Limit: "},
    {name: 'description', type: 'str', minLength: 1, maxLength: 255,
        label: 'Reward ("... to _____ ")'}
];

// Callbacks
cb.onDrawPanel(function(user) {

    return {
        'template': '3_rows_11_21_31',
        row1_value: 'TIP The LUCKY Number Below: ',
//             row1_value: 'TIP the following to guess the LUCKY Number: ',
        row2_value: ostr,
//                row2_value: '',
        row3_value: ''
    };
});

cb.onTip(function(tip){

    var grossTip = parseInt(tip['amount']);
    var workingTip = 0;

    if ( tip['message'].match( /optout/i ) != null ) {
        return;
    }

    net += grossTip;

    while ( lucky != 0 && grossTip > 0 ) {
        if ( grossTip >= findHighRemaining() ) {
            workingTip = findHighRemaining();
            grossTip -= workingTip;
        } else {
            // This ensures that we only auto play safe numbers (i.e. starting
            // at the highest and going down CONSECUTIVELY).  Otherwise, consider
            // something like a range of 11-30 . . . a tip of 50 comes in . . .
            // 30 (the max) would be safe, but no telling about 20 - so don't
            // auto play it
            if ( grossTip == parseInt(tip['amount']) ) {
                workingTip = grossTip;
                grossTip = 0;
            }  else {
                workingTip = 0; // Dropping the final remainder to prevent auto play
                grossTip = 0;
            }
        }

        if ( workingTip == lucky ) {
            cb.changeRoomSubject( tip['from_user'] +
                    " has tipped the LUCKY number! ('lucky' was " + lucky + ")");
            ostr = space20 + space20 + space20 + space20 + space20; // yes, I know this is fugly and amateurish
            cb.drawPanel();
            cb.chatNotice( "Total tokens = " + net + " Duplicate and Out of Range Tips = " + bonus, cb.room_slug );
            lucky = 0; // Game over
        }
        else {
            if ( workingTip == unlucky ) {
                cb.chatNotice( "\nOh no! The UNLUCKY number was tipped! Numbers reset ('lucky' was " + lucky + ")","","",bcp.red,"bolder" );
                reset_numbers();
                ShowIntro();
            }
            else {
                if ( workingTip >= cb.settings.lowlimit && workingTip <= cb.settings.highlimit ) {
                    if ( picked[workingTip] == 1 )
                        bonus += workingTip;
                    picked[workingTip] = 1;
                    --remaining;
                    BuildRemaining();
                }
                else
                    bonus += workingTip;
            }
        }
    }
});

cb.onMessage( function (msg) {
//    if ( String.toUpper(msg['m']) == '/RULES') {  No toUpper on CB?
    if ( msg['m'] == '/rules') {
        msg['X-Spam'] = true;
        ShowRules(msg['user']);
    }
    return msg;
});


// Helpers
function getRandomNumber(min, max) {

    return (Math.floor(((Math.random() * (max - min + 1)) + min) ))  ;

}

function BuildRemaining() {

    var i, j, p;

    ostr = "";
    p = cb.settings.lowlimit;
    while ( p <= cb.settings.highlimit ) {
        if ( picked[p] == 1 ) {
            p++;
            continue;
        }
        if (remaining < 51 ) {
            // ostr = ostr + p + "-" + ( i - 1) + " ";
            ostr = ostr + p + " ";
            p++;
            }
        else {
            for ( i = p + 1; i <= cb.settings.highlimit && picked[i] == 0; i++ ) ; // Search for contiguous blocks of unpicked
            if ( i < p + 3 ) {  // Not enough to warrant a block
                    ostr = ostr + p + " ";
                    p++;
                     }
            else {
                    ostr = ostr + p + "-" + ( i - 1) + " ";
                    p = i;
                 }
        }
    } //while

    cb.drawPanel();

}

function reset_numbers() {

    // Minor cheating here - lucky will never be the min #
    lucky = getRandomNumber(cb.settings.lowlimit + 1, cb.settings.highlimit);
    if ( lucky > cb.settings.lowlimit ) {
        unlucky = lucky;
        while (unlucky >= lucky )
            unlucky = getRandomNumber(cb.settings.lowlimit, lucky );
    }
    else {
        unlucky = lucky;
        while (unlucky == lucky ) {
            unlucky = getRandomNumber(cb.settings.lowlimit, cb.settings.highlimit);
        }
    }
    for (var i = cb.settings.lowlimit; i <= cb.settings.highlimit; picked[i++] = 0 ) ;

    remaining = cb.settings.highlimit - cb.settings.lowlimit + 1;

    BuildRemaining();

}

function findHighRemaining() {

    var x = cb.settings.highlimit;
    while ( picked[x] == 1 ) {
        x--;
    }

    return x;
}
function ShowIntro() {
    cb.chatNotice("\nTip the LUCKY number from " + cb.settings.lowlimit + "-" +
        cb.settings.highlimit + " to " + cb.settings.description +
        "\nBeware of the UNLUCKY number - it resets the game with new numbers" +
        "\nThe broadcaster does NOT know either number!\nType /rules for complete details.\n" +
        "\nTo tip without playing, put the word 'optout' in your tip note\n","","",bcp.blue,"bold");

    cb.setTimeout(ShowIntro, 900000);

}

function ShowRules(toUser) {

    cb.chatNotice(
        "\nThe Lucky/Unlucky Number Game:\n\n" +
            "Two numbers are randomly chosen: a LUCKY \n" +
            "number and an UNLUCKY number.Your job is \n" +
            "to find the LUCKY number before the UNLUCKY\n" + "" +
            "number. You make your guess by TIPPING!\n\n" +
            "If you get the LUCKY number, you win the\n" +
            "prize in the topic!!! But if you get the\n" +
            "UNLUCKY number, all the numbers reset and\n" +
            "the game starts over!\n\n" +
            "The numbers that have NOT been tipped yet\n" +
            "are shown in the panel below the video feed.\n\n" +
            "The broadcaster does NOT know either number!!!\n\n" +
            "Good Luck and Enjoy the Show!\n\n" +
            "NEW: To tip without playing, put the word optout in your tip note\n\n" +
            "NEW: Tips greater than the highest picked number will\n" +
            "     SAFELY pick the highest available numbers\n",
        toUser, "",bcp.blue,"bold");
}

function Init() {

    reset_numbers();
    cb.changeRoomSubject("TIP the LUCKY number from " + cb.settings.lowlimit +
        "-" + cb.settings.highlimit + " to " + cb.settings.description +
        " Try not to TIP the UNLUCKY Number or the Game Resets!" );
    ShowIntro();

}


if (!!AppDevKit == false ) {
	Init();
}
