/* V3.2 原创校园通信内容。这里只放数据，不读写存档，也不推进回合。 */
(function(root){
  'use strict';
  const greeting={
    zhixia:'我是林知夏。把你的备注存好了。课程资料可以在这里互相发，不过不用随时在线，先把自己的生活过好。',
    shenyan:'沈砚，通过了。技术社群消息太多，有真正想讨论的问题直接找我。报错截图记得带上下文。',
    chengle:'室友通讯录正式建成！本人提供食堂情报、叫醒服务，以及偶尔不太好笑的笑话。',
    nanqiao:'你好，许南乔。创业社的事情可以在这里聊。不用先想出完美方案，一个真实的问题就值得讨论。',
    qinghe:'我是顾清禾。今天路上那束光很好看，可惜照片拍不出风。以后遇到好看的校园角落，想和你分享。',
    teacherzhou:'我是周老师。课程和发展方面有疑问可以留言，把已尝试的方法一起写上。我会在方便时回复，不必一直等。'
  };
  // 每个人两组日常情境，每组三个方向；关系选项沿用 V3.1 的互动索引。
  const threads=[
    {id:'zhixia-plan',npc:'zhixia',title:'计划表上的空白',when:{},text:'我把周末的学习计划排满了，结果越看越不想打开书。你会怎么安排？',options:[
      {label:'交换各自的一种学习方法',flag:'zhixia-method',relationChoice:0,answer:'好，我先发最管用的那一条：做错题时写清楚“为什么这样想”，比抄答案有用。你的方法我也想试试。'},
      {label:'先留出一段不安排事情的时间',flag:'zhixia-space',answer:'那我把周日下午留白。原来休息也可以认真写进计划里。'},
      {label:'说说自己也会拖延的时候',flag:'zhixia-honest',answer:'谢谢你没把一切说得轻而易举。听完之后，我没那么紧绷了。'}]},
    {id:'zhixia-exam',npc:'zhixia',title:'分数之外',when:{minTerm:2,action:'study',count:1},text:'上次小测有一道题我想得太复杂。分数不理想，但我终于知道自己卡在哪里了。你怎么看？',options:[
      {label:'听她把那个卡住的地方讲完',flag:'zhixia-listen',relationChoice:1,answer:'讲出来之后好像清楚多了。下次我会先把基础条件写明白，不急着证明自己。'},
      {label:'提议把错题整理成一页思路',flag:'zhixia-review',answer:'一页就够，这个主意好。不做厚厚一本，只留下真正改变想法的地方。'},
      {label:'约定考完后各自做件喜欢的事',flag:'zhixia-balance',answer:'成交。我想去校园里那家一直没空去的小书店。'}]},
    {id:'shenyan-debug',npc:'shenyan',title:'关掉那个死循环',when:{},text:'刚修好一个很小的错误，找了两个小时。现在看那一行代码，觉得它在笑我。',options:[
      {label:'交换一次自己排错的经历',flag:'shenyan-debug',relationChoice:0,answer:'原来你也踩过这个坑。下回我先做最小复现，别抱着整个项目硬找。'},
      {label:'建议离开屏幕去喝杯水',flag:'shenyan-break',answer:'已执行。回来第一眼就看见另一个拼写错误……水确实有用。'},
      {label:'请他给错误起个纪念名字',flag:'shenyan-humor',answer:'就叫“两小时失踪案”。我把它写进了开发日志，留给未来的自己笑。'}]},
    {id:'shenyan-team',npc:'shenyan',title:'谁来接下一棒',when:{minTerm:3,action:'skill',count:1},text:'技术社准备练习赛。我本来想全包，后来发现队友连任务做到哪都不知道。你会怎么拆？',options:[
      {label:'一起检查一个小项目的分工',flag:'shenyan-share',relationChoice:2,answer:'我们把接口和截止时间写清楚了。这次我留出让别人做决定的空间，也接受不同的办法。'},
      {label:'先听每个人愿意负责什么',flag:'shenyan-voice',answer:'刚问完，有人主动接了我最不擅长的展示环节。合作果然不只是分掉工作量。'},
      {label:'先做能运行的小版本',flag:'shenyan-small',answer:'有东西能一起试，比一张完美计划有用。今晚不加需求了。'}]},
    {id:'chengle-dinner',npc:'chengle',title:'今天吃什么',when:{},text:'重大议题：食堂二楼新品和老窗口，选哪个？我的饭卡和好奇心正在进行友好协商。',options:[
      {label:'分享今天路上的小发现',flag:'chengle-share',relationChoice:0,answer:'那就顺路去看看。跟你聊天总能多发现一点校园的使用方法。'},
      {label:'建议先点小份，给未知留点余地',flag:'chengle-try',answer:'通过！新品不惊艳也没事，至少有下次聊天的素材。'},
      {label:'投老窗口一票，稳稳吃饱',flag:'chengle-steady',answer:'懂了，今天走踏实路线。阿姨已经认得我的碗了。'}]},
    {id:'chengle-night',npc:'chengle',title:'没接上的那个笑话',when:{minTerm:2,action:'exercise',count:1},text:'今天大家都在聊以后，我又讲了个笑话。其实我也没想好自己擅长什么，只是不太会认真开口。',options:[
      {label:'认真听他把烦恼说完',flag:'chengle-trust',relationChoice:1,answer:'说完没有立刻找到答案，但轻松一点了。谢谢你没有急着给我一个目标。'},
      {label:'提议各自试一件小事，再交换感受',flag:'chengle-tryout',answer:'这个我能做到。我先去运动会后勤帮一次忙，看看自己喜欢什么。'},
      {label:'告诉他不搞笑的时候也值得被陪伴',flag:'chengle-quiet',answer:'那我今天先当一个普通室友。明天再讲笑话，今天谢谢你。'}]},
    {id:'nanqiao-question',npc:'nanqiao',title:'先把问题说小',when:{},text:'有人提议做“全能校园平台”。我问第一批使用的人具体是谁，讨论突然安静了。你最近遇到过什么小麻烦？',options:[
      {label:'交换一条真实的校园观察',flag:'nanqiao-observe',relationChoice:0,answer:'这条够具体。我先记下发生的时间和地点，再问问其他人，不急着把它变成项目。'},
      {label:'建议先访谈三个同学',flag:'nanqiao-interview',answer:'好，问题只问经历，不诱导大家夸想法。这比投票选名字更有意义。'},
      {label:'坦言暂时没有合适的问题',flag:'nanqiao-honest',answer:'没关系。承认还不知道，比编一个需求可靠。以后看见了再告诉我。'}]},
    {id:'nanqiao-team',npc:'nanqiao',title:'没有通过的提案',when:{minTerm:3,action:'social',count:1},text:'社团提案没通过。组员有点泄气，我也不甘心，但现在直接重做一份，好像又会错过他们的感受。',options:[
      {label:'先听她谈谈团队里的难题',flag:'nanqiao-support',relationChoice:1,answer:'谢谢。决定要不要继续之前，我会先和每个人谈清楚愿意投入多少时间。'},
      {label:'把评审意见分成能改和暂时做不到的',flag:'nanqiao-scope',answer:'这样看，没有通过不等于全部无效。我们先改最关键的一处。'},
      {label:'建议允许团队休息一晚再决定',flag:'nanqiao-pause',answer:'今晚不发新任务了。负责也包括不把自己的焦虑变成别人的加班。'}]},
    {id:'qinghe-light',npc:'qinghe',title:'看见一小片光',when:{},text:'今天拍到一片落在课本上的树影。没发到哪里，只是想留着。你通常会记住校园里的什么？',options:[
      {label:'聊聊自己喜欢的校园角落',flag:'qinghe-corner',relationChoice:0,answer:'我记下来，但不会急着去拍。有些地方先作为你喜欢的地方存在，就很好。'},
      {label:'分享一个声音或气味的记忆',flag:'qinghe-senses',answer:'照片拍不到这些，所以你的描述刚好补上了画面外的一部分。'},
      {label:'告诉她普通的一天也值得记录',flag:'qinghe-ordinary',answer:'嗯，不一定有大事发生才按快门。我会把今天认真留在手账里。'}]},
    {id:'qinghe-work',npc:'qinghe',title:'相机背后的人',when:{minTerm:2,action:'skill',count:1},text:'我想做一组校园照片，可是一想到别人会评价，就想选最安全的题材。你做作品时也会这样吗？',options:[
      {label:'听她讲最想拍、却还没拍的主题',flag:'qinghe-listen',relationChoice:1,answer:'其实我想拍“没有被安排好的时刻”。说出来之后，感觉它终于不是只在脑子里的东西了。'},
      {label:'建议先做一份只给自己看的小样',flag:'qinghe-draft',answer:'先拍三张，不急着办展。这样我今晚就可以开始。'},
      {label:'分享自己面对评价时的笨办法',flag:'qinghe-courage',answer:'原来勇气也可以是一点点练出来的。那我们都先做完一小步。'}]},
    {id:'teacherzhou-question',npc:'teacherzhou',title:'把问题问清楚',when:{},text:'最近有人问我“怎样才能变优秀”。这个问题太大。你可以先告诉我，一周里最具体的一处困难。',options:[
      {label:'说明自己已经试过哪些方法',flag:'zhou-evidence',relationChoice:0,answer:'这些尝试很有价值。下次带着一个具体例子来，我们从能验证的地方继续。'},
      {label:'坦诚自己暂时不知道该问什么',flag:'zhou-start',answer:'先观察三天：什么时候最容易卡住，卡住前在做什么。问题可以慢慢长清楚。'},
      {label:'询问怎样区分不懂和还不熟练',flag:'zhou-method',answer:'试着不看笔记解释原理，再独立做一个变化题。卡在哪里，会比“会不会”更清楚。'}]},
    {id:'teacherzhou-direction',npc:'teacherzhou',title:'方向不是标准答案',when:{minTerm:3,action:'study',count:2},text:'学习了一段时间，你可以开始整理自己愿意长期投入的问题。升学、就业都需要依据，不必替别人完成选择。',options:[
      {label:'一起检查一份已有课程成果',flag:'zhou-review',relationChoice:2,answer:'我标出了需要补证据的地方。先把自己的工作解释清楚，再讨论下一站，这份认真会一直有用。'},
      {label:'询问如何了解不同职业的日常',flag:'zhou-career',answer:'去看真实岗位的任务，找愿意分享的人聊具体一天。职位名称不能替代工作本身。'},
      {label:'说明自己想再探索一段时间',flag:'zhou-explore',answer:'可以。为探索留一个复盘时间，记录做了什么、喜欢什么，而不是要求现在就确定一生。'}]}
  ];
  const feed=[
    ['zhixia',1,'把课程表抄进手账，最后特意空出两格。那两格写着：散步。','学习生活'],
    ['shenyan',1,'技术社第一次见面，没有先讲厉害的项目。大家各展示了一次失败，气氛忽然很好。','社团活动'],
    ['chengle',1,'宿舍公约第一条：耳机不是装饰。第二条：有人想早睡时，大家真的小声一点。','宿舍日常'],
    ['nanqiao',1,'招新摊位收到最多的问题是“不会做策划能参加吗”。当然能，愿意认真观察生活就很好。','社团活动'],
    ['qinghe',1,'拍下入学那天的路标。以后熟到不再看它时，也会记得自己曾经找了很久的路。','校园摄影'],
    ['teacherzhou',1,'给新同学：提出问题不需要先证明自己足够聪明。课堂欢迎不确定，也欢迎不同思路。','学业提醒'],
    ['zhixia',3,'图书馆换了一个靠窗的位置。今天的目标只写三项，完成以后就按时走。','学习生活'],
    ['shenyan',3,'练习赛结束，最好的收获是队友能看懂我的提交说明。漂亮的代码也要有人能接着维护。','专业竞赛'],
    ['chengle',3,'运动会后勤小队报到。没跑第一名，但今天把水一瓶不少地送到了终点。','校园运动会'],
    ['nanqiao',3,'第一次调研被同学反问：“你真的用过这条流程吗？”问得好，明天先自己走一遍。','创业观察'],
    ['qinghe',3,'同一棵树，隔一年再拍，光还是不一样。人也是。','校园摄影'],
    ['teacherzhou',3,'期末前的提醒：睡眠也是准备的一部分。把最基础的问题讲清楚，比熬夜多抄几页更有用。','考试通知'],
    ['zhixia',5,'和学姐聊了研究生活。不是每天都有发现，更多时候是耐心地排除一种可能。想再认真了解。','未来方向'],
    ['shenyan',5,'给小项目补了使用说明。终于体会到，作品交给别人用时，才会看见自己没想到的细节。','专业项目'],
    ['chengle',5,'宿舍今天一起修好了摇晃的椅子。毕业简历暂时不写这条，但生活能力确实增加了。','宿舍日常'],
    ['nanqiao',5,'团队这次主动缩小了计划。不是退步，是终于知道自己能负责到哪里。','团队合作'],
    ['qinghe',5,'把没被选进展览的照片重新排了一遍。原来我仍然喜欢它们，这就值得留下。','校园创作'],
    ['teacherzhou',5,'实习申请前先核实岗位任务、时间与指导安排。合适的经历，应当让你更了解自己。','实习提醒'],
    ['zhixia',8,'整理书架时翻到大一的计划表。有些没完成，有些已经不想完成。都不妨碍继续往前。','毕业季'],
    ['shenyan',8,'仓库准备交接。最后一次提交不是结束，是让下一位同学不用从零猜起。','毕业季'],
    ['chengle',8,'毕业整理清单：还饭卡、搬行李、把大家借给我的小东西还回去。好像最难整理的是习惯。','毕业季'],
    ['nanqiao',8,'给团队写了下一页：以后大家可能走不同的路，但一起认真做过的事不会被撤销。','毕业季'],
    ['qinghe',8,'毕业照前先问了每个人想站在哪里。这一次，我也会在照片里。','毕业季'],
    ['teacherzhou',8,'办公室的门以后仍然可以敲。离开校园后，希望你继续保留好奇，也照顾好自己的生活。','毕业寄语']
  ].map(([npc,minTerm,text,tag],i)=>({id:'feed-'+(i+1),npc,minTerm,text,tag}));
  const task=(id,name,type,desc,condition,goal,measure,when={},npc=null)=>({id,name,type,desc,condition,goal,measure,when,npc});
  const tasks=[
    task('daily-rest','留一点休息时间','日常','给忙碌的日子留出恢复空间。','完成 2 次好好休息；历史行动计入',2,'rest'),
    task('daily-exercise','到操场走走','日常','不必追求名次，先让身体动起来。','完成 2 次健身运动',2,'exercise'),
    task('npc-meet','认识校园里的同行者','人物','在人物档案中与不同的人相识。','认识六位 NPC；室友计入',6,'met'),
    task('npc-listen','认真倾听三次','人物','一次真诚交流，比反复打招呼更有意义。','累计 3 次 V3.1 关系互动，聊天关系回复也计入',3,'interactions'),
    task('npc-reply','有来有往','人物','用自己的方向回应一段校园日常。','完成 2 组聊天回复；普通回复也计入',2,'replies'),
    task('study-plan','三次灯下的积累','学业','把小目标放进真实的学习行动。','认真学习 3 次',3,'study'),
    task('study-finals','第一次期末回望','学业','完成原有期末考试事件的选择。','实际完成 1 次期末考试事件',1,'finals'),
    task('contest-ready','把想法做成作品','竞赛','先练基本功，再走向更大的挑战。','技能训练 3 次；大二开放',3,'skill',{minTerm:3},'shenyan'),
    task('contest-play','站上一次赛场','竞赛','参与原有编程比赛的组队挑战。','大二起、技能至少 30，实际选择“组队挑战”',1,'contest',{minTerm:3}),
    task('club-first','找到一扇新门','社团','去原有招新活动里体验校园组织。','完成 1 次社团招新事件',1,'club'),
    task('club-observe','交换校园观察','社团','通过主要行动认识不同的校园生活。','完成 2 次社交活动',2,'social'),
    task('term-first','收好第一个学期','学期','完成总结后，向下一段校园生活出发。','阅读并确认第 1 学期总结',1,'terms'),
    task('term-graduate','四年的回响','学期','不要求某一种结局，认真走完自己的路线。','完成 32 回合并进入原有毕业结局',1,'graduate')
  ];
  const categories=['学业','竞赛','社团','人物','学期','实习与就业'];
  const types=['日常','人物','学业','竞赛','社团','学期'];
  const api={greeting,threads,feed,tasks,categories,types,thread:id=>threads.find(t=>t.id===id)};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PhoneData=api;
})(typeof window!=='undefined'?window:globalThis);
