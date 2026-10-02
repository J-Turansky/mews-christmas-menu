/**
 * Mews Christmas Menu 2026 – form chart sync (v1.0.0)
 *
 * Reads the Google Form with your Google account, counts the answers to
 * every choice question and commits the totals to data.json in the
 * GitHub Pages repo. Only aggregate counts leave Google; names and
 * free-text answers are never published.
 *
 * One-off setup (see README.md):
 *   1. Project Settings > Script properties > add GITHUB_TOKEN
 *      (fine-grained PAT, repo J-Turansky/mews-christmas-menu, Contents: read and write).
 *   2. Run setup() once and approve the permissions prompt.
 */

var CONFIG = {
  formId: '1bYYuGiLmg0G8M2hOVlAJbyEgsshwjs5tlTpu7wbmLao',
  owner: 'J-Turansky',
  repo: 'mews-christmas-menu',
  branch: 'main',
  path: 'data.json',
  everyHours: 6
};

/** Run once: creates the 6-hourly trigger and does a first sync. */
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sync') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sync').timeBased().everyHours(CONFIG.everyHours).create();
  sync();
}

/** Builds the summary and pushes it to GitHub. Runs every 6 hours. */
function sync() {
  var data = buildSummary_();
  pushToGitHub_(JSON.stringify(data, null, 2) + '\n');
  Logger.log('Synced ' + data.totalResponses + ' responses, ' + data.questions.length + ' charts.');
}

function buildSummary_() {
  var form = FormApp.openById(CONFIG.formId);
  var responses = form.getResponses();
  var questions = [];
  var byId = {};

  form.getItems().forEach(function (item) {
    var type = item.getType();
    var choices = null;
    var allowsOther = false;
    var kind = 'pie';
    if (type === FormApp.ItemType.MULTIPLE_CHOICE) {
      var mc = item.asMultipleChoiceItem();
      choices = mc.getChoices().map(function (c) { return c.getValue(); });
      allowsOther = mc.hasOtherOption();
    } else if (type === FormApp.ItemType.LIST) {
      choices = item.asListItem().getChoices().map(function (c) { return c.getValue(); });
    } else if (type === FormApp.ItemType.CHECKBOX) {
      var cb = item.asCheckboxItem();
      choices = cb.getChoices().map(function (c) { return c.getValue(); });
      allowsOther = cb.hasOtherOption();
      kind = 'bar';
    } else if (type === FormApp.ItemType.SCALE) {
      var sc = item.asScaleItem();
      choices = [];
      for (var v = sc.getLowerBound(); v <= sc.getUpperBound(); v++) choices.push(String(v));
    } else {
      return; // text, date, grid etc. are not charted (and may hold personal data)
    }
    var q = { title: item.getTitle(), kind: kind, answered: 0, counts: {}, order: choices.slice(), allowsOther: allowsOther };
    choices.forEach(function (c) { q.counts[c] = 0; });
    if (allowsOther) { q.counts['Other'] = 0; q.order.push('Other'); }
    byId[item.getId()] = q;
    questions.push(q);
  });

  responses.forEach(function (r) {
    r.getItemResponses().forEach(function (ir) {
      var q = byId[ir.getItem().getId()];
      if (!q) return;
      var ans = ir.getResponse();
      var list = Array.isArray(ans) ? ans : [ans];
      var counted = false;
      list.forEach(function (a) {
        if (a === null || a === '') return;
        a = String(a);
        if (!Object.prototype.hasOwnProperty.call(q.counts, a)) {
          if (!q.allowsOther) return;
          a = 'Other'; // never publish free-text "Other" answers
        }
        q.counts[a]++;
        counted = true;
      });
      if (counted) q.answered++;
    });
  });

  return {
    title: form.getTitle(),
    updated: new Date().toISOString(),
    totalResponses: responses.length,
    acceptingResponses: form.isAcceptingResponses(),
    questions: questions.map(function (q) {
      return {
        title: q.title,
        kind: q.kind,
        answered: q.answered,
        counts: q.order.map(function (label) { return { label: label, count: q.counts[label] }; })
      };
    })
  };
}

function pushToGitHub_(content) {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('Add the GITHUB_TOKEN script property first (see README).');
  var url = 'https://api.github.com/repos/' + CONFIG.owner + '/' + CONFIG.repo + '/contents/' + CONFIG.path;
  var headers = {
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  var sha = null;
  var get = UrlFetchApp.fetch(url + '?ref=' + CONFIG.branch, { headers: headers, muteHttpExceptions: true });
  if (get.getResponseCode() === 200) sha = JSON.parse(get.getContentText()).sha;
  else if (get.getResponseCode() !== 404) throw new Error('GitHub read failed: ' + get.getResponseCode() + ' ' + get.getContentText());

  var body = {
    message: 'Update form totals ' + Utilities.formatDate(new Date(), 'Europe/London', 'dd/MM/yyyy HH:mm'),
    content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
    branch: CONFIG.branch
  };
  if (sha) body.sha = sha;

  var put = UrlFetchApp.fetch(url, {
    method: 'put',
    headers: headers,
    contentType: 'application/json',
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  if (put.getResponseCode() >= 300) throw new Error('GitHub write failed: ' + put.getResponseCode() + ' ' + put.getContentText());
}
