console.log('检查GitHub Token状态...');
console.log('已配置的Token数量:', GitHubService.getTokenCount());
console.log('有可用Token:', GitHubService.hasToken());
console.log('请在控制台中运行以下代码测试Token效果：');
console.log('GitHubService.searchWithGitHubApi("test").then(r => console.log("搜索结果数量:", r.length))');
