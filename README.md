# Another Internationalization Tool

## Configure Git

Upon cloning the repository, make sure to enable the Git hooks:

```
rm -r .git/hooks && ln -s ../etc/git/hooks .git/hooks
```

## Installation

Install Node.js & NPM.

Install JSCS & JSHint globally:

```
npm install jscs --global
npm install jshint --global
```

Install [gettext](https://www.gnu.org/software/gettext/) with [gettext utilities](https://www.gnu.org/software/gettext/manual/gettext.html).
