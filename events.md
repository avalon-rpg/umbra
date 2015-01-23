Events produced by shadowclient
===============================

avalon connected
----------------

_Sent when the telnet connection is established_

No params


login success
-------------

_Sent when the user has logged in successfully_

No params


avalon disconnected
-------------------

_Sent when the telnet connection has closed_

params:
*had-error: Boolean = True if disconnected with an error




input
-----

_Sent for any input line, comes in sub-categories_

params:

* data: Object = A javascript object, fields depend on the sub-category - as determined by the `qual` field.


####user

_Sent when a user name is seen, ether as part of a WHO list, or freshly logged into the land_

data fields:

* qual: String = 'user'
* who: String = The user's (full) name


####calling from

_When someone has called on a channel_

data fields:

* qual: String = 'calling from'
* who: String = The (simple) name of the user who made the call
* chan: String = The name of the channel called to
* msg: String = The contents of the call


####calling to

_When Avalon confirms you called on a channel_

data fields:

* qual: String = 'calling to'
* chan: String = The name of the channel called to
* msg: String = The contents of the call


####novice-calling from

_When someone has called on a channel_

data fields:

* qual: String = 'novice calling from'
* who: String = The (simple) name of the user who made the call
* chan: String = The city the caller hails from
* msg: String = The contents of the call


####novice-calling to

_When Avalon confirms you called on a channel_

data fields:

* qual: String = 'novice calling to'
* chan: String = The city you hail from
* msg: String = The contents of the call


####tell from

_When you receive a tell from someone_

data fields:

* qual: String = 'tell from'
* who: String = The (simple) name of the user the tell is from
* msg: String = The contents of the tell


####tell to

_When avalon confirms you have sent a tell to someone_

data fields:

* qual: String = 'tell to'
* who: String = The (simple) name of the user the tell is to
* msg: String = The contents of the tell


####msg

_A dedicated message sent by avalon, to display as-is_

data fields:

* qual: String = 'msg'
* lines: Array[String] = An array of lines constituting the message


####unparsed

_Any input line from Avalon that the client couldn't parse_

data fields:

* qual: String = 'unparsed'
* line: String = The unparsed line

