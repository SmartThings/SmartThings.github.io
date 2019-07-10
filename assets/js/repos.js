(function ($) {
    'use strict';

    var updated = [];
    var allRepos = [];
    var allLangs = [];
    var repoUrls = {};
    var $langList = $(document.getElementById('lang-list'));

    function repoUrl(repo) {
        return repoUrls[repo.name] || repo.html_url;
    }

    function renderRepo($index) {
        var repo = allRepos[$index];
        var $item = $('<div>').addClass('card').addClass(repo.language === null ? '' : repo.language);
        var $link = $('<a target="_blank">').attr('href', repoUrl(repo));

        $item.append($('<h4>').html(repo.name));
        $item.append($('<small>').addClass('watchers').text(repo.watchers === null ? '' : repo.watchers));
        $item.append($('<small>').addClass('forks').text(repo.forks === null ? '' : repo.forks));
        $item.append($('<small>').addClass('language').text(repo.language === null ? '' : repo.language));
        $item.append($('<p>').text(repo.description === null ? '' : repo.description));

        $link.append($('<p>').addClass('link').text('GitHub »'));
        $link.appendTo($item);

        $item.appendTo('#allrepos');
    }

    function renderSidebar() {
        $('.filter-lang')
            .removeClass('active')
            .off('click');

        $langList.html('');
        var liList = [];

        allLangs = allLangs.sort();

        liList.push([
            '<li>',
            '<a href="#showall" onclick="location.reload()">All</a>',
            '</li>'
        ].join(''));

        for (var i = 0, len = allLangs.length; i < len; i++) {
            liList.push([
                '<li>',
                '<a class="filter-lang" data-lang="' + allLangs[i] + '" href="#">' + allLangs[i] + '</a>',
                '</li>'
            ].join(''));
        }

        $langList.html(liList.join(''));
        $('.filter-lang').on('click', function (event) {
            event.preventDefault();
            $('.filter-lang').removeClass('active');

            filterByLang($(this).attr('data-lang'));

            $(this).addClass('active');
        });
    }

    function filterByLang(lang) {
        $('#allrepos').html('');

        var indexRepoLangList = allRepos
            .filter(function (repo) {
                return repo.language === lang;
            })
            .map(function (repo) {
                return allRepos.indexOf(repo);
            });

        for (var r = 0, len = indexRepoLangList.length; r < len; r++) {
            renderRepo(indexRepoLangList[r]);
        }
    }

    function addAllRepos() {
        $('#allrepos').addClass('card-columns');

        for (var r = 0, len = allRepos.length; r < len; r++) {
            renderRepo(r);
        }
    }

    function pushRepo(repos) {
        var left = repos;
        var right = allRepos;
        var result = [];
        var il = 0;
        var ir = 0;

        while (il < left.length && ir < right.length) {
            if (left[il].name.toLowerCase() < right[ir].name.toLowerCase()) {
                result.push(left[il++]);
            } else {
                result.push(right[ir++]);
            }
        }

        allRepos = result.concat(left.slice(il)).concat(right.slice(ir));
    }

    function mergeUpdated(repos) {
        var left = repos;
        var right = updated;
        var result = [];
        var il = 0;
        var ir = 0;

        while (il < left.length && ir < right.length) {
            if (left[il].pushed_at > right[ir].pushed_at) {
                result.push(left[il++]);
            } else {
                result.push(right[ir++]);
            }
        }

        updated = result.concat(left.slice(il)).concat(right.slice(ir));
    }

    function addRepos(orgs, repos) {
        var forks = [];
        var org = orgs.name;
        var reposcmd = orgs.type === 'repo' ? '' : '/repos';

        repos = repos || [];

        // There are three supported request types: org, user and repo. Syntax differs.
        if (orgs.type !== 'org' && orgs.type !== 'user' && orgs.type !== 'repo') {
            console.log('** Unknown type “' + orgs.type + '” for org “' + org +
                '” — check “orgs.js” for typo.');
            return;
        }

        var uri = 'https://api.github.com/' + orgs.type + 's/' + org + reposcmd +
            '?per_page=1000&client_id=&client_secret=';

        $.getJSON(uri, function (result) {
            if (!Array.isArray(result)) {
                result = [].concat(result);
            }

            if (result && result.length > 0) {
                repos = repos.concat(result);

                $.each(repos, function (i, repo) {
                    repo.pushed_at = new Date(repo.pushed_at);

                    if (repo.fork === true) {
                        forks.push(i);
                    }

                    if (repo.language && allLangs.indexOf(repo.language) === -1) {
                        allLangs.push(repo.language);
                    }
                });

                $.each(forks, function (i, forkindex) {
                    var indextoremove = forkindex - i;

                    repos.splice(indextoremove, 1);
                });

                repos.sort(function (a, b) {
                    if (a.pushed_at < b.pushed_at) {
                        return 1;
                    }

                    if (b.pushed_at < a.pushed_at) {
                        return -1;
                    }

                    return 0;
                });

                mergeUpdated(repos);

                repos.sort(function (a, b) {
                    if (a.name.toLowerCase() > b.name.toLowerCase()) {
                        return 1;
                    }

                    if (b.name.toLowerCase() > a.name.toLowerCase()) {
                        return -1;
                    }

                    return 0;
                });

                pushRepo(repos);

                addAllRepos();

                renderSidebar();
            }
        });
    }

    $('<div>').appendTo('#wrapper').append($('<div id="allrepos">'));

    for (var r in window.orgs) {
        if (Object.prototype.hasOwnProperty.call(window.orgs, r)) {
            addRepos(window.orgs[r]);
        }
    }

    /*
     * Search for $repo.name & render result
     */
    $('#search').keyup(function () {
        var val = $.trim($(this).val()).replace(/ +/g, ' ').toLowerCase();
        var $rows = $('.card');

        $rows.show().filter(function () {
            var text = $(this).text().replace(/\s+/g, ' ').toLowerCase();

            return text.indexOf(val) === -1;
        }).hide();
    });

    $('body').on('click', 'a[data-analytics-category][data-analytics-action]', function (e) {
        if (!window.ga) {
            return;
        }

        if (this.hostname && this.hostname !== location.hostname) {
            e.preventDefault();
            var url = this.href;

            setTimeout(function () {
                document.location = url;
            }, 200);
        }

        var $el = $(this);
        var data = {
            hitType: 'event'
        };

        data.eventCategory = $el.attr('data-analytics-category');
        data.eventAction = $el.attr('data-analytics-action');

        if ($el.attr('data-analytics-label')) {
            data.eventLabel = $el.attr('data-analytics-label');
        }

        if ($el.attr('data-analytics-value')) {
            data.eventValue = parseInt($el.attr('data-analytics-value'), 10);
        }

        window.ga('send', data);
    });
})(jQuery);
